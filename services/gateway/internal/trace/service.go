package trace

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

var (
	ErrTraceNotFound = errors.New("payment trace not found")
)

// Service provides deterministic reconstruction of financial payment traces.
type Service interface {
	GetPaymentTrace(ctx context.Context, orgID, intentID string) (*domain.PaymentTrace, error)
}

// DefaultService reconstructs PaymentTrace instances from persistent storage.
type DefaultService struct {
	repo            storage.Repository
	arcChainID      string
	explorerBaseURL string
}

// NewService creates a new DefaultService.
func NewService(repo storage.Repository, arcChainID, explorerBaseURL string) *DefaultService {
	if arcChainID == "" {
		arcChainID = blockchain.DefaultArcChainID
	}
	return &DefaultService{
		repo:            repo,
		arcChainID:      arcChainID,
		explorerBaseURL: explorerBaseURL,
	}
}

// GetPaymentTrace reconstructs the complete, immutable financial trace for a given payment intent.
func (s *DefaultService) GetPaymentTrace(ctx context.Context, orgID, intentID string) (*domain.PaymentTrace, error) {
	if intentID == "" {
		return nil, ErrTraceNotFound
	}

	intent, err := s.repo.GetIntent(ctx, intentID)
	if err != nil {
		return nil, ErrTraceNotFound
	}

	// Organization isolation check: never reveal another organization's trace
	if orgID != "" && intent.OrganizationID != "" && intent.OrganizationID != orgID {
		return nil, ErrTraceNotFound
	}

	// Determine execution mode (LIVE vs SIMULATION)
	execMode := domain.ExecutionModeLive
	if intent.VaultAddress == "0x0000000000000000000000000000000000000000" ||
		strings.Contains(strings.ToLower(intent.Purpose), "simulation") ||
		strings.Contains(strings.ToLower(intent.Purpose), "demo") {
		execMode = domain.ExecutionModeSimulation
	}

	trace := &domain.PaymentTrace{
		TraceID:            fmt.Sprintf("trc_%s", intent.IntentID),
		OrganizationID:     intent.OrganizationID,
		AgentID:            intent.AgentID,
		PaymentIntentID:    intent.IntentID,
		Status:             string(intent.Status),
		ExecutionMode:      execMode,
		CreatedAt:          intent.CreatedAt,
		UpdatedAt:          intent.UpdatedAt,
		Steps:              make([]domain.TraceStep, 0),
		PaymentSummary: domain.PaymentSummary{
			IntentID:       intent.IntentID,
			OrganizationID: intent.OrganizationID,
			AgentID:        intent.AgentID,
			ServiceID:      intent.ServiceID,
			Recipient:      intent.Recipient,
			Amount:         intent.Amount,
			Asset:          intent.Asset,
			Purpose:        intent.Purpose,
			Justification:  intent.Justification,
			RequestID:      intent.RequestID,
		},
	}

	// Fetch Audit Events correlated with this intent
	auditEvents, _ := s.repo.ListAuditEventsWithFilter(ctx, intent.OrganizationID, "", intent.IntentID, "", 500)

	// Sort audit events chronologically (ascending)
	sort.SliceStable(auditEvents, func(i, j int) bool {
		return auditEvents[i].Timestamp.Before(auditEvents[j].Timestamp)
	})

	// Reconstruct structured evidence
	s.reconstructPolicyEvidence(trace, intent, auditEvents)
	s.reconstructApprovalEvidence(ctx, trace, intent)
	s.reconstructTreasuryEvidence(ctx, trace, intent)
	s.reconstructBlockchainEvidence(ctx, trace, intent)

	// Build discrete chronological steps
	s.buildTraceSteps(trace, intent, auditEvents)

	return trace, nil
}

func (s *DefaultService) reconstructPolicyEvidence(trace *domain.PaymentTrace, intent *intent.PaymentIntent, events []*storage.AuditEvent) {
	ev := &domain.PolicyEvidence{
		Decision:    domain.Decision(intent.PolicyDecision),
		ReasonCode:  domain.ReasonCode(intent.PolicyReason),
		Reason:      intent.PolicyReason,
		EvaluatedAt: intent.UpdatedAt,
	}

	// Enrich from policy audit event metadata if present
	for _, evt := range events {
		if evt.EventType == string(domain.EventPaymentIntentAuthorized) ||
			evt.EventType == string(domain.EventPaymentIntentDenied) ||
			evt.EventType == string(domain.EventPaymentIntentApprovalRequired) {
			ev.EvaluatedAt = evt.Timestamp
			var meta map[string]interface{}
			if err := json.Unmarshal([]byte(evt.Metadata), &meta); err == nil {
				if dec, ok := meta["decision"].(string); ok && dec != "" {
					ev.Decision = domain.Decision(dec)
				}
				if rc, ok := meta["reason_code"].(string); ok && rc != "" {
					ev.ReasonCode = domain.ReasonCode(rc)
				}
				if r, ok := meta["reason"].(string); ok && r != "" {
					ev.Reason = r
				}
				if ver, ok := meta["policy_version"].(string); ok && ver != "" {
					ev.PolicyVersion = ver
				}
				if rl, ok := meta["risk_level"].(string); ok && rl != "" {
					level := domain.RiskLevel(rl)
					ev.RiskLevel = &level
				}
				if rs, ok := meta["risk_score"].(float64); ok {
					score := uint32(rs)
					ev.RiskScore = &score
				}
				if rdl, ok := meta["remaining_daily_limit"].(float64); ok {
					limit := uint64(rdl)
					ev.RemainingDailyLimit = &limit
				}
				if checksRaw, ok := meta["checks"].([]interface{}); ok {
					checks := make([]domain.RuleCheck, 0, len(checksRaw))
					for _, c := range checksRaw {
						if cMap, ok := c.(map[string]interface{}); ok {
							rule, _ := cMap["rule"].(string)
							passed, _ := cMap["passed"].(bool)
							msg, _ := cMap["message"].(string)
							checks = append(checks, domain.RuleCheck{
								Rule:    rule,
								Passed:  passed,
								Message: msg,
							})
						}
					}
					ev.Checks = checks
				}
			}
			break
		}
	}

	if ev.Decision != "" {
		trace.PolicyEvidence = ev
	}
}

func (s *DefaultService) reconstructApprovalEvidence(ctx context.Context, trace *domain.PaymentTrace, pi *intent.PaymentIntent) {
	appr, err := s.repo.GetApprovalByIntent(ctx, pi.IntentID)
	if err == nil && appr != nil {
		trace.ApprovalEvidence = &domain.ApprovalEvidence{
			ApprovalID:      appr.ID,
			Required:        appr.Required,
			Status:          string(appr.Status),
			RequestedAt:     appr.RequestedAt,
			ResolvedAt:      appr.ResolvedAt,
			ApprovedBy:      appr.ApprovedBy,
			RejectionReason: appr.RejectionReason,
		}
	}
}

func (s *DefaultService) reconstructTreasuryEvidence(ctx context.Context, trace *domain.PaymentTrace, pi *intent.PaymentIntent) {
	res, err := s.repo.GetReservationByIntent(ctx, pi.IntentID)
	if err == nil && res != nil {
		trace.TreasuryEvidence = &domain.TreasuryEvidence{
			ReservationID: res.ID,
			VaultAddress:  res.VaultAddress,
			Amount:        res.Amount,
			Asset:         pi.Asset,
			Status:        string(res.Status),
			ReservedAt:    res.CreatedAt,
			SettledAt:     &res.UpdatedAt,
		}
	}
}

func (s *DefaultService) reconstructBlockchainEvidence(ctx context.Context, trace *domain.PaymentTrace, pi *intent.PaymentIntent) {
	ex, err := s.repo.GetExecution(ctx, pi.IntentID)
	if err == nil && ex != nil {
		explorerURL := ""
		if ex.TransactionHash != "" && s.explorerBaseURL != "" {
			explorerURL = blockchain.BuildExplorerTxURL(s.explorerBaseURL, ex.TransactionHash)
		}

		trace.BlockchainEvidence = &domain.BlockchainEvidence{
			ChainID:         s.arcChainID,
			Network:         "arc-mainnet",
			TransactionHash: ex.TransactionHash,
			From:            pi.VaultAddress,
			To:              pi.Recipient,
			SubmittedAt:     ex.SubmittedAt,
			ConfirmedAt:     ex.ConfirmedAt,
			Status:          ex.Status,
			ExplorerURL:     explorerURL,
			ErrorMessage:    ex.ErrorCode,
		}
	}
}

func (s *DefaultService) buildTraceSteps(trace *domain.PaymentTrace, pi *intent.PaymentIntent, events []*storage.AuditEvent) {
	steps := make([]domain.TraceStep, 0)
	stepNumber := 1

	// 1. If we have persisted AuditEvents, map each one deterministically
	for _, evt := range events {
		stepType := mapEventTypeToTraceStep(evt.EventType)
		if stepType == "" {
			continue
		}

		meta := make(map[string]interface{})
		if evt.Metadata != "" {
			_ = json.Unmarshal([]byte(evt.Metadata), &meta)
		}
		sanitizeMetadata(meta)

		reasonCodes := make([]string, 0)
		if rc, ok := meta["reason_code"].(string); ok && rc != "" {
			reasonCodes = append(reasonCodes, rc)
		}

		status := "COMPLETED"
		if strings.Contains(evt.EventType, "denied") || strings.Contains(evt.EventType, "failed") || strings.Contains(evt.EventType, "rejected") {
			status = "FAILED"
		} else if strings.Contains(evt.EventType, "approval_required") {
			status = "PENDING"
		} else if strings.Contains(evt.EventType, "ambiguous") {
			status = "AMBIGUOUS"
		}

		actor := evt.ActorType
		if evt.ActorID != "" {
			actor = fmt.Sprintf("%s:%s", evt.ActorType, evt.ActorID)
		}

		steps = append(steps, domain.TraceStep{
			StepNumber:    stepNumber,
			StepID:        fmt.Sprintf("step_%02d_%s", stepNumber, evt.ID),
			TraceID:       trace.TraceID,
			Type:          stepType,
			Status:        status,
			Timestamp:     evt.Timestamp,
			Actor:         actor,
			CorrelationID: evt.CorrelationID,
			Metadata:      meta,
			ReasonCodes:   reasonCodes,
		})
		stepNumber++
	}

	// 2. If no audit events were found in storage, synthesize canonical steps from intent state
	if len(steps) == 0 {
		steps = s.synthesizeCanonicalSteps(trace, pi)
	}

	trace.Steps = steps
}

func (s *DefaultService) synthesizeCanonicalSteps(trace *domain.PaymentTrace, pi *intent.PaymentIntent) []domain.TraceStep {
	steps := make([]domain.TraceStep, 0)
	seq := 1
	correlationID := pi.RequestID
	if correlationID == "" {
		correlationID = pi.IntentID
	}

	// 1. REQUESTED
	steps = append(steps, domain.TraceStep{
		StepNumber:    seq,
		StepID:        fmt.Sprintf("step_%02d_req", seq),
		TraceID:       trace.TraceID,
		Type:          domain.TraceStepPaymentRequested,
		Status:        "COMPLETED",
		Timestamp:     pi.CreatedAt,
		Actor:         fmt.Sprintf("AGENT:%s", pi.AgentID),
		CorrelationID: correlationID,
		Metadata: map[string]interface{}{
			"amount":    pi.Amount,
			"asset":     pi.Asset,
			"recipient": pi.Recipient,
			"service":   pi.ServiceID,
			"purpose":   pi.Purpose,
		},
	})
	seq++

	// 2. IDENTITY_VERIFIED
	steps = append(steps, domain.TraceStep{
		StepNumber:    seq,
		StepID:        fmt.Sprintf("step_%02d_id", seq),
		TraceID:       trace.TraceID,
		Type:          domain.TraceStepIdentityVerified,
		Status:        "COMPLETED",
		Timestamp:     pi.CreatedAt.Add(5 * time.Millisecond),
		Actor:         "SYSTEM",
		CorrelationID: correlationID,
		Metadata: map[string]interface{}{
			"agent_id":        pi.AgentID,
			"organization_id": pi.OrganizationID,
			"vault_address":   pi.VaultAddress,
		},
	})
	seq++

	// 3. SERVICE_RESOLVED
	steps = append(steps, domain.TraceStep{
		StepNumber:    seq,
		StepID:        fmt.Sprintf("step_%02d_svc", seq),
		TraceID:       trace.TraceID,
		Type:          domain.TraceStepServiceResolved,
		Status:        "COMPLETED",
		Timestamp:     pi.CreatedAt.Add(10 * time.Millisecond),
		Actor:         "SYSTEM",
		CorrelationID: correlationID,
		Metadata: map[string]interface{}{
			"service_id": pi.ServiceID,
			"recipient":  pi.Recipient,
		},
	})
	seq++

	// 4. POLICY_EVALUATED
	if trace.PolicyEvidence != nil {
		status := "COMPLETED"
		stepType := domain.TraceStepPolicyEvaluated
		if trace.PolicyEvidence.Decision == domain.DecisionDeny {
			status = "FAILED"
			stepType = domain.TraceStepPaymentDenied
		}

		steps = append(steps, domain.TraceStep{
			StepNumber:    seq,
			StepID:        fmt.Sprintf("step_%02d_pol", seq),
			TraceID:       trace.TraceID,
			Type:          stepType,
			Status:        status,
			Timestamp:     trace.PolicyEvidence.EvaluatedAt,
			Actor:         "SYSTEM:policy-engine",
			CorrelationID: correlationID,
			Metadata: map[string]interface{}{
				"decision":       string(trace.PolicyEvidence.Decision),
				"reason":         trace.PolicyEvidence.Reason,
				"policy_version": trace.PolicyEvidence.PolicyVersion,
			},
			ReasonCodes: []string{string(trace.PolicyEvidence.ReasonCode)},
		})
		seq++
	}

	// 5. APPROVAL_REQUIRED / APPROVED
	if trace.ApprovalEvidence != nil {
		steps = append(steps, domain.TraceStep{
			StepNumber:    seq,
			StepID:        fmt.Sprintf("step_%02d_appr_req", seq),
			TraceID:       trace.TraceID,
			Type:          domain.TraceStepApprovalRequired,
			Status:        "COMPLETED",
			Timestamp:     trace.ApprovalEvidence.RequestedAt,
			Actor:         "SYSTEM",
			CorrelationID: correlationID,
			Metadata: map[string]interface{}{
				"approval_id": trace.ApprovalEvidence.ApprovalID,
			},
		})
		seq++

		if trace.ApprovalEvidence.ResolvedAt != nil {
			apprType := domain.TraceStepPaymentApproved
			apprStatus := "COMPLETED"
			if trace.ApprovalEvidence.Status == "REJECTED" {
				apprType = domain.TraceStepPaymentRejected
				apprStatus = "FAILED"
			}
			steps = append(steps, domain.TraceStep{
				StepNumber:    seq,
				StepID:        fmt.Sprintf("step_%02d_appr_res", seq),
				TraceID:       trace.TraceID,
				Type:          apprType,
				Status:        apprStatus,
				Timestamp:     *trace.ApprovalEvidence.ResolvedAt,
				Actor:         fmt.Sprintf("USER:%s", trace.ApprovalEvidence.ApprovedBy),
				CorrelationID: correlationID,
				Metadata: map[string]interface{}{
					"rejection_reason": trace.ApprovalEvidence.RejectionReason,
				},
			})
			seq++
		}
	}

	// 6. TREASURY_RESERVED
	if trace.TreasuryEvidence != nil {
		steps = append(steps, domain.TraceStep{
			StepNumber:    seq,
			StepID:        fmt.Sprintf("step_%02d_treasury", seq),
			TraceID:       trace.TraceID,
			Type:          domain.TraceStepTreasuryReserved,
			Status:        "COMPLETED",
			Timestamp:     trace.TreasuryEvidence.ReservedAt,
			Actor:         "SYSTEM:treasury",
			CorrelationID: correlationID,
			Metadata: map[string]interface{}{
				"reservation_id": trace.TreasuryEvidence.ReservationID,
				"amount":         trace.TreasuryEvidence.Amount,
				"vault_address":  trace.TreasuryEvidence.VaultAddress,
			},
		})
		seq++
	}

	// 7. BLOCKCHAIN TRANSACTION CONFIRMED / FAILED / AMBIGUOUS
	if trace.BlockchainEvidence != nil {
		bStepType := domain.TraceStepTransactionConfirmed
		bStatus := "COMPLETED"
		if trace.BlockchainEvidence.Status == "FAILED" {
			bStepType = domain.TraceStepTransactionFailed
			bStatus = "FAILED"
		} else if trace.BlockchainEvidence.Status == "AMBIGUOUS" {
			bStepType = domain.TraceStepTransactionAmbiguous
			bStatus = "AMBIGUOUS"
		}

		bTimestamp := pi.UpdatedAt
		if trace.BlockchainEvidence.ConfirmedAt != nil {
			bTimestamp = *trace.BlockchainEvidence.ConfirmedAt
		} else if trace.BlockchainEvidence.SubmittedAt != nil {
			bTimestamp = *trace.BlockchainEvidence.SubmittedAt
		}

		steps = append(steps, domain.TraceStep{
			StepNumber:    seq,
			StepID:        fmt.Sprintf("step_%02d_tx", seq),
			TraceID:       trace.TraceID,
			Type:          bStepType,
			Status:        bStatus,
			Timestamp:     bTimestamp,
			Actor:         "SYSTEM:arc-executor",
			CorrelationID: correlationID,
			Metadata: map[string]interface{}{
				"chain_id":         trace.BlockchainEvidence.ChainID,
				"transaction_hash": trace.BlockchainEvidence.TransactionHash,
				"explorer_url":     trace.BlockchainEvidence.ExplorerURL,
				"error":            trace.BlockchainEvidence.ErrorMessage,
			},
		})
		seq++
	}

	// 8. FINAL COMPLETION
	if pi.Status == intent.StatusConfirmed {
		steps = append(steps, domain.TraceStep{
			StepNumber:    seq,
			StepID:        fmt.Sprintf("step_%02d_complete", seq),
			TraceID:       trace.TraceID,
			Type:          domain.TraceStepPaymentCompleted,
			Status:        "COMPLETED",
			Timestamp:     pi.UpdatedAt,
			Actor:         "SYSTEM",
			CorrelationID: correlationID,
			Metadata: map[string]interface{}{
				"final_status": string(pi.Status),
			},
		})
	}

	return steps
}

func mapEventTypeToTraceStep(eventType string) string {
	switch eventType {
	case string(domain.EventPaymentIntentCreated), "payment.created":
		return domain.TraceStepPaymentRequested
	case string(domain.EventPaymentIntentAuthorized), "payment.authorized":
		return domain.TraceStepPolicyEvaluated
	case string(domain.EventPaymentIntentDenied), "payment.denied":
		return domain.TraceStepPaymentDenied
	case string(domain.EventPaymentIntentApprovalRequired), "payment.approval_required":
		return domain.TraceStepApprovalRequired
	case string(domain.EventApprovalApproved), "payment.approved":
		return domain.TraceStepPaymentApproved
	case string(domain.EventApprovalRejected), "payment.rejected":
		return domain.TraceStepPaymentRejected
	case string(domain.EventTreasuryReserved):
		return domain.TraceStepTreasuryReserved
	case string(domain.EventTreasuryReleased):
		return domain.TraceStepTreasuryReleased
	case string(domain.EventPaymentIntentExecuting):
		return domain.TraceStepExecutionStarted
	case string(domain.EventPaymentIntentAmbiguous):
		return domain.TraceStepTransactionAmbiguous
	case string(domain.EventPaymentIntentConfirmed), "payment.confirmed":
		return domain.TraceStepTransactionConfirmed
	case string(domain.EventPaymentIntentFailed), "payment.failed":
		return domain.TraceStepTransactionFailed
	default:
		return ""
	}
}

// sanitizeMetadata strips any secrets, private keys, or passwords from trace metadata.
func sanitizeMetadata(m map[string]interface{}) {
	sensitiveKeys := []string{
		"private_key", "secret", "password", "authorization",
		"key_hash", "token", "apiKey", "signer_key",
	}
	for k := range m {
		lowerK := strings.ToLower(k)
		for _, sens := range sensitiveKeys {
			if strings.Contains(lowerK, sens) {
				delete(m, k)
				break
			}
		}
	}
}
