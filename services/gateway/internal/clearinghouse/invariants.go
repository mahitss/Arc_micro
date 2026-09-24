package clearinghouse

import (
	"errors"
	"fmt"
	"math/big"
	"strings"
)

// Security Invariants INV-201 to INV-220 for AgentPay Autonomous Economic Clearing Network
const (
	INV201_ClearingCannotCreateFinancialAuthority      = "INV-201: Clearing cannot create financial authority"
	INV202_NettingCannotCreateValue                    = "INV-202: Netting cannot create value"
	INV203_NettingCannotBypassPolicy                   = "INV-203: Netting cannot bypass policy"
	INV204_NettingCannotBypassRisk                     = "INV-204: Netting cannot bypass risk"
	INV205_NettingCannotBypassApproval                 = "INV-205: Netting cannot bypass approval"
	INV206_NettingCannotBypassTreasury                 = "INV-206: Netting cannot bypass treasury"
	INV207_SettledObligationsCannotSilentlyMutate      = "INV-207: Settled obligations cannot silently mutate"
	INV208_DuplicateSettlementCannotCreateDuplicatePay = "INV-208: Duplicate settlement cannot create duplicate payment"
	INV209_AmbiguousSettlementCannotBeBlindlyRetried   = "INV-209: Ambiguous settlement cannot be blindly rebroadcast"
	INV210_DisputedObligationsCannotSilentlySettle     = "INV-210: Disputed obligations cannot silently settle"
	INV211_ExpiredObligationsCannotSettleWithoutReval  = "INV-211: Expired obligations cannot settle without revalidation"
	INV212_RecurringObligationsRequirePerOccurrenceVal = "INV-212: Recurring obligations require per-occurrence validation"
	INV213_CrossTenantObligationsAreIsolated          = "INV-213: Cross-tenant obligations are isolated"
	INV214_CounterpartyExposureDerivedFromObligations  = "INV-214: Counterparty exposure is derived from authoritative obligations"
	INV215_MarketplaceStateCannotDirectlyMutateLedger  = "INV-215: Marketplace state cannot directly mutate ledger state"
	INV216_ProtocolMessagesCannotDirectlyMutateLedger  = "INV-216: Protocol messages cannot directly mutate ledger state"
	INV217_SimulatorCannotMutateClearingState          = "INV-217: Simulator cannot mutate clearing state"
	INV218_ReadModelsCannotMutateFinancialTruth        = "INV-218: Read models cannot mutate financial truth"
	INV219_UnverifiedBlockchainEvidenceCannotBeSettled = "INV-219: Unverified blockchain evidence cannot be treated as settlement"
	INV220_NettingCannotReduceAccountingValueWrongly   = "INV-220: Netting cannot reduce accounting value incorrectly"
)

// Invariant error definitions
var (
	ErrClearingAuthorityBypass   = errors.New(INV201_ClearingCannotCreateFinancialAuthority)
	ErrNettingValueCreation      = errors.New(INV202_NettingCannotCreateValue)
	ErrNettingPolicyBypass       = errors.New(INV203_NettingCannotBypassPolicy)
	ErrNettingRiskBypass         = errors.New(INV204_NettingCannotBypassRisk)
	ErrNettingApprovalBypass     = errors.New(INV205_NettingCannotBypassApproval)
	ErrNettingTreasuryBypass     = errors.New(INV206_NettingCannotBypassTreasury)
	ErrSettledObligationMutation = errors.New(INV207_SettledObligationsCannotSilentlyMutate)
	ErrDuplicateSettlement       = errors.New(INV208_DuplicateSettlementCannotCreateDuplicatePay)
	ErrBlindRebroadcastBlocked   = errors.New(INV209_AmbiguousSettlementCannotBeBlindlyRetried)
	ErrDisputedSettlementBlocked = errors.New(INV210_DisputedObligationsCannotSilentlySettle)
	ErrExpiredSettlementBlocked  = errors.New(INV211_ExpiredObligationsCannotSettleWithoutReval)
	ErrRecurringRevalRequired    = errors.New(INV212_RecurringObligationsRequirePerOccurrenceVal)
	ErrCrossTenantIsolation      = errors.New(INV213_CrossTenantObligationsAreIsolated)
	ErrExposureLimitBreached     = errors.New(INV214_CounterpartyExposureDerivedFromObligations)
	ErrMarketplaceDirectMutation = errors.New(INV215_MarketplaceStateCannotDirectlyMutateLedger)
	ErrProtocolDirectMutation    = errors.New(INV216_ProtocolMessagesCannotDirectlyMutateLedger)
	ErrSimulatorMutationBlocked  = errors.New(INV217_SimulatorCannotMutateClearingState)
	ErrReadModelMutationBlocked  = errors.New(INV218_ReadModelsCannotMutateFinancialTruth)
	ErrUnverifiedEvidenceBlocked = errors.New(INV219_UnverifiedBlockchainEvidenceCannotBeSettled)
	ErrNettingAccountingMismatch = errors.New(INV220_NettingCannotReduceAccountingValueWrongly)
)

// ValidateNettingValueConservation checks that multi-party netting proposal does not create or destroy net value.
// Enforces INV-202 and INV-220.
func ValidateNettingValueConservation(originalTotal, netTotal, savings string) error {
	origInt, ok1 := new(big.Int).SetString(strings.TrimSpace(originalTotal), 10)
	netInt, ok2 := new(big.Int).SetString(strings.TrimSpace(netTotal), 10)
	savInt, ok3 := new(big.Int).SetString(strings.TrimSpace(savings), 10)
	if !ok1 || !ok2 || !ok3 {
		return fmt.Errorf("%w: invalid numeric values in netting conservation check", ErrNettingAccountingMismatch)
	}

	// Net cannot exceed gross original
	if netInt.Cmp(origInt) > 0 {
		return fmt.Errorf("%w: proposed net amount %s exceeds gross original %s", ErrNettingValueCreation, netTotal, originalTotal)
	}

	// Net + Savings must equal Original Gross
	reconstructed := new(big.Int).Add(netInt, savInt)
	if reconstructed.Cmp(origInt) != 0 {
		return fmt.Errorf("%w: net (%s) + savings (%s) != gross (%s)", ErrNettingAccountingMismatch, netTotal, savings, originalTotal)
	}

	return nil
}

// ValidateTenantIsolation ensures entities belong to the same tenant.
// Enforces INV-213.
func ValidateTenantIsolation(expectedTenant, actualTenant string) error {
	if expectedTenant == "" || actualTenant == "" {
		return nil // Permissive if not configured
	}
	if expectedTenant != actualTenant {
		return fmt.Errorf("%w: tenant mismatch '%s' vs '%s'", ErrCrossTenantIsolation, expectedTenant, actualTenant)
	}
	return nil
}

// ValidateNoMutationOnSettled prevents silent edits to settled obligations.
// Enforces INV-207.
func ValidateNoMutationOnSettled(status ObligationStatus, oldAmount, newAmount string) error {
	if status == ObligationSettled && oldAmount != newAmount {
		return fmt.Errorf("%w: cannot mutate amount of settled obligation from %s to %s", ErrSettledObligationMutation, oldAmount, newAmount)
	}
	return nil
}

// ValidateDisputePreventsSettlement ensures disputed obligations cannot settle.
// Enforces INV-210.
func ValidateDisputePreventsSettlement(status ObligationStatus) error {
	if status == ObligationDisputed {
		return fmt.Errorf("%w: obligation is currently under dispute", ErrDisputedSettlementBlocked)
	}
	return nil
}
