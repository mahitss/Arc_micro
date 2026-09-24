package clearinghouse

import (
	"math/big"
	"strings"
	"time"
)

// ExposureCalculator aggregates economic risk, exposure, and health metrics.
type ExposureCalculator struct{}

func NewExposureCalculator() *ExposureCalculator {
	return &ExposureCalculator{}
}

// CalculateExposure aggregates total current and worst-case liabilities for an organization.
func (ec *ExposureCalculator) CalculateExposure(
	orgID string,
	obligations []*EconomicObligation,
	escrows []*EconomicEscrow,
	invoices []*EconomicInvoice,
	schedules []*PaymentSchedule,
	milestones []*PaymentMilestone,
	mode ExecutionMode,
) *EconomicExposureSnapshot {
	now := time.Now().UTC()

	var (
		outstandingObligationsTotal = big.NewInt(0)
		reservedFundsTotal          = big.NewInt(0)
		pendingInvoicesTotal        = big.NewInt(0)
		scheduledPaymentsTotal      = big.NewInt(0)
		disputedValueTotal          = big.NewInt(0)
		potentialMilestoneTotal     = big.NewInt(0)
		counterparties              = make(map[string]*CounterpartyExposure)
	)

	getOrCreateCounterparty := func(agentID string) *CounterpartyExposure {
		if _, exists := counterparties[agentID]; !exists {
			counterparties[agentID] = &CounterpartyExposure{
				AgentID:             agentID,
				AmountOwed:          "0",
				AmountPaid:          "0",
				AmountReserved:      "0",
				AmountDisputed:      "0",
				AmountRefunded:      "0",
				MaxPossibleExposure: "0",
			}
		}
		return counterparties[agentID]
	}

	// 1. Obligations Exposure
	for _, ob := range obligations {
		if ob.OrganizationID != orgID || ob.ExecutionMode != mode {
			continue
		}
		amt, _ := new(big.Int).SetString(strings.TrimSpace(ob.Amount), 10)
		if amt == nil {
			amt = big.NewInt(0)
		}
		settledAmt, _ := new(big.Int).SetString(strings.TrimSpace(ob.SettledAmount), 10)
		if settledAmt == nil {
			settledAmt = big.NewInt(0)
		}
		remaining := new(big.Int).Sub(amt, settledAmt)
		if remaining.Sign() < 0 {
			remaining = big.NewInt(0)
		}

		cp := getOrCreateCounterparty(ob.PayeeAgentID)
		cp.ActiveObligations++

		switch ob.Status {
		case ObligationSettled:
			curPaid, _ := new(big.Int).SetString(cp.AmountPaid, 10)
			if curPaid == nil {
				curPaid = big.NewInt(0)
			}
			cp.AmountPaid = new(big.Int).Add(curPaid, amt).String()

		case ObligationDisputed:
			disputedValueTotal.Add(disputedValueTotal, remaining)
			curDisp, _ := new(big.Int).SetString(cp.AmountDisputed, 10)
			if curDisp == nil {
				curDisp = big.NewInt(0)
			}
			cp.AmountDisputed = new(big.Int).Add(curDisp, remaining).String()

		case ObligationRefunded:
			curRef, _ := new(big.Int).SetString(cp.AmountRefunded, 10)
			if curRef == nil {
				curRef = big.NewInt(0)
			}
			cp.AmountRefunded = new(big.Int).Add(curRef, amt).String()

		case ObligationProposed, ObligationAuthorized, ObligationReserved,
			ObligationDue, ObligationSubmitted, ObligationVerified,
			ObligationSettlementPending, ObligationPartiallySettled:
			outstandingObligationsTotal.Add(outstandingObligationsTotal, remaining)
			curOwed, _ := new(big.Int).SetString(cp.AmountOwed, 10)
			if curOwed == nil {
				curOwed = big.NewInt(0)
			}
			cp.AmountOwed = new(big.Int).Add(curOwed, remaining).String()
		}
	}

	// 2. Escrows (Reserved Funds)
	for _, esc := range escrows {
		if esc.OrganizationID != orgID || esc.ExecutionMode != mode {
			continue
		}
		resAmt, _ := new(big.Int).SetString(strings.TrimSpace(esc.ReservedAmount), 10)
		if resAmt != nil && (esc.Status == EscrowReserved || esc.Status == EscrowPartiallyReleased) {
			reservedFundsTotal.Add(reservedFundsTotal, resAmt)
			cp := getOrCreateCounterparty(esc.Payee)
			curRes, _ := new(big.Int).SetString(cp.AmountReserved, 10)
			if curRes == nil {
				curRes = big.NewInt(0)
			}
			cp.AmountReserved = new(big.Int).Add(curRes, resAmt).String()
		}
	}

	// 3. Invoices (Pending Settlement)
	for _, inv := range invoices {
		if inv.OrganizationID != orgID || inv.ExecutionMode != mode {
			continue
		}
		amt, _ := new(big.Int).SetString(strings.TrimSpace(inv.Amount), 10)
		if amt != nil && (inv.Status == InvoiceIssued || inv.Status == InvoiceAccepted || inv.Status == InvoiceDue) {
			pendingInvoicesTotal.Add(pendingInvoicesTotal, amt)
		}
	}

	// 4. Payment Schedules (Future Recurring Commitments)
	for _, sched := range schedules {
		if sched.OrganizationID != orgID || !sched.Active {
			continue
		}
		amtPer, _ := new(big.Int).SetString(strings.TrimSpace(sched.AmountPerPayment), 10)
		maxVal, _ := new(big.Int).SetString(strings.TrimSpace(sched.MaxTotalValue), 10)
		settledVal, _ := new(big.Int).SetString(strings.TrimSpace(sched.TotalSettledValue), 10)
		if amtPer == nil {
			amtPer = big.NewInt(0)
		}
		if maxVal == nil {
			maxVal = big.NewInt(0)
		}
		if settledVal == nil {
			settledVal = big.NewInt(0)
		}

		remainingOccurrences := sched.MaxOccurrences - sched.OccurredCount
		if remainingOccurrences > 0 {
			schedRemaining := new(big.Int).Mul(amtPer, big.NewInt(int64(remainingOccurrences)))
			// Bound by max total value if specified
			if maxVal.Sign() > 0 {
				ceilingRemaining := new(big.Int).Sub(maxVal, settledVal)
				if ceilingRemaining.Sign() > 0 && schedRemaining.Cmp(ceilingRemaining) > 0 {
					schedRemaining = ceilingRemaining
				}
			}
			scheduledPaymentsTotal.Add(scheduledPaymentsTotal, schedRemaining)
		}
	}

	// 5. Unsettled Milestones
	for _, ms := range milestones {
		if ms.OrganizationID != orgID {
			continue
		}
		amt, _ := new(big.Int).SetString(strings.TrimSpace(ms.Amount), 10)
		if amt != nil && (ms.Status == MilestonePending || ms.Status == MilestoneSubmitted || ms.Status == MilestoneVerified) {
			potentialMilestoneTotal.Add(potentialMilestoneTotal, amt)
		}
	}

	// Current Exposure: actual commitments currently in motion = Outstanding Obligations + Disputed
	currentExp := new(big.Int).Add(outstandingObligationsTotal, disputedValueTotal)

	// Max Possible Exposure: worst-case if all milestones complete + all future schedule occurrences execute
	maxExp := new(big.Int).Add(currentExp, scheduledPaymentsTotal)
	maxExp.Add(maxExp, potentialMilestoneTotal)

	// Update Counterparty Max Possible Exposure
	for _, cp := range counterparties {
		owed, _ := new(big.Int).SetString(cp.AmountOwed, 10)
		if owed == nil {
			owed = big.NewInt(0)
		}
		disp, _ := new(big.Int).SetString(cp.AmountDisputed, 10)
		if disp == nil {
			disp = big.NewInt(0)
		}
		res, _ := new(big.Int).SetString(cp.AmountReserved, 10)
		if res == nil {
			res = big.NewInt(0)
		}
		totalCP := new(big.Int).Add(owed, disp)
		totalCP.Add(totalCP, res)
		cp.MaxPossibleExposure = totalCP.String()
	}

	return &EconomicExposureSnapshot{
		OrganizationID:             orgID,
		SnapshotTimestamp:          now,
		CurrentExposure:            currentExp.String(),
		MaxPossibleExposure:        maxExp.String(),
		OutstandingObligations:     outstandingObligationsTotal.String(),
		ReservedFunds:              reservedFundsTotal.String(),
		PendingInvoices:            pendingInvoicesTotal.String(),
		ScheduledPayments:          scheduledPaymentsTotal.String(),
		DisputedValue:              disputedValueTotal.String(),
		PotentialMilestoneExposure: potentialMilestoneTotal.String(),
		CounterpartyBreakdown:      counterparties,
		ExecutionMode:              mode,
	}
}

// CalculateHealth generates comprehensive financial health metrics without hiding details.
func (ec *ExposureCalculator) CalculateHealth(
	orgID string,
	onChainBalance string,
	exposure *EconomicExposureSnapshot,
	settledCount int,
	failedCount int,
	reconciliationMismatchCount int,
	activeContracts int,
	netReceivables string,
	netPayables string,
) *EconomicHealthSnapshot {
	balInt, ok := new(big.Int).SetString(strings.TrimSpace(onChainBalance), 10)
	if !ok || balInt.Sign() < 0 {
		balInt = big.NewInt(0)
	}

	resInt, _ := new(big.Int).SetString(strings.TrimSpace(exposure.ReservedFunds), 10)
	if resInt == nil {
		resInt = big.NewInt(0)
	}

	available := new(big.Int).Sub(balInt, resInt)
	if available.Sign() < 0 {
		available = big.NewInt(0)
	}

	// Success rate in basis points (0 - 10000)
	totalTx := settledCount + failedCount
	successBps := 10000
	if totalTx > 0 {
		successBps = (settledCount * 10000) / totalTx
	}

	return &EconomicHealthSnapshot{
		OrganizationID:              orgID,
		Timestamp:                   time.Now().UTC(),
		AvailableFunds:              available.String(),
		ReservedFunds:               exposure.ReservedFunds,
		OutstandingObligations:      exposure.OutstandingObligations,
		PendingSettlement:           exposure.PendingInvoices,
		DisputedFunds:               exposure.DisputedValue,
		ScheduledExposure:           exposure.ScheduledPayments,
		NetReceivables:              netReceivables,
		NetPayables:                 netPayables,
		SettlementSuccessRateBps:    successBps,
		ReconciliationMismatchCount: reconciliationMismatchCount,
		ActiveContractsCount:        activeContracts,
		ExecutionMode:               exposure.ExecutionMode,
	}
}

// EvaluateRiskSignals computes deterministic clearinghouse risk flags for policy engines.
func (ec *ExposureCalculator) EvaluateRiskSignals(
	health *EconomicHealthSnapshot,
	exposure *EconomicExposureSnapshot,
) (score int, signals []string) {
	score = 0
	signals = make([]string, 0)

	// 1. High Outstanding Obligations vs Available Funds
	availInt, _ := new(big.Int).SetString(health.AvailableFunds, 10)
	outInt, _ := new(big.Int).SetString(health.OutstandingObligations, 10)
	if availInt != nil && outInt != nil && availInt.Sign() > 0 {
		ratio := new(big.Int).Mul(outInt, big.NewInt(100))
		ratio.Div(ratio, availInt)
		if ratio.Int64() > 80 {
			score += 25
			signals = append(signals, "RISK_HIGH_OBLIGATION_RATIO")
		} else if ratio.Int64() > 50 {
			score += 15
			signals = append(signals, "RISK_ELEVATED_OBLIGATION_RATIO")
		}
	}

	// 2. High Reserved Percentage
	resInt, _ := new(big.Int).SetString(health.ReservedFunds, 10)
	if availInt != nil && resInt != nil {
		totalLiq := new(big.Int).Add(availInt, resInt)
		if totalLiq.Sign() > 0 {
			resPct := new(big.Int).Mul(resInt, big.NewInt(100))
			resPct.Div(resPct, totalLiq)
			if resPct.Int64() > 75 {
				score += 20
				signals = append(signals, "RISK_HIGH_LIQUIDITY_LOCK")
			}
		}
	}

	// 3. Repeated Settlement Failures
	if health.SettlementSuccessRateBps < 8000 {
		score += 30
		signals = append(signals, "RISK_HIGH_SETTLEMENT_FAILURE_RATE")
	} else if health.SettlementSuccessRateBps < 9500 {
		score += 15
		signals = append(signals, "RISK_ELEVATED_SETTLEMENT_FAILURE_RATE")
	}

	// 4. Reconciliation Mismatches
	if health.ReconciliationMismatchCount > 0 {
		score += 25
		signals = append(signals, "RISK_RECONCILIATION_MISMATCH_DETECTED")
	}

	// 5. Disputed Funds
	dispInt, _ := new(big.Int).SetString(health.DisputedFunds, 10)
	if dispInt != nil && dispInt.Sign() > 0 {
		score += 15
		signals = append(signals, "RISK_ACTIVE_DISPUTES_PRESENT")
	}

	if score > 100 {
		score = 100
	}
	return score, signals
}
