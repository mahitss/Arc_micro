package agent

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

var (
	ErrTaskTimeout             = errors.New("agent task execution exceeded timeout")
	ErrApprovalTimeout         = errors.New("timed out waiting for human approval")
	ErrMaxPaymentAttemptsExceeded = errors.New("maximum payment attempts exceeded for task")
	ErrAmountAboveSafetyCap    = errors.New("requested amount exceeds agent safety cap")
	ErrServiceNotAllowed       = errors.New("requested service is not in agent allowed services list")
)

// AgentSafetyConfig defines operational boundaries for the autonomous agent.
type AgentSafetyConfig struct {
	MaxPaymentAmount   string        // micro-USDC integer string (e.g. "5000000" for 5.00 USDC)
	MaxPaymentAttempts int           // Max payment requests per task
	TaskTimeout        time.Duration // Total timeout for task execution
	ToolTimeout        time.Duration // Timeout for single tool invocation
	PaymentTimeout     time.Duration // Timeout for payment execution
	ApprovalTimeout    time.Duration // Timeout when waiting in WAITING_FOR_APPROVAL
	AllowedServices    []string      // Whitelisted service IDs
}

// DefaultSafetyConfig returns conservative, secure defaults.
func DefaultSafetyConfig() AgentSafetyConfig {
	return AgentSafetyConfig{
		MaxPaymentAmount:   "5000000", // 5.00 USDC
		MaxPaymentAttempts: 3,
		TaskTimeout:        60 * time.Second,
		ToolTimeout:        10 * time.Second,
		PaymentTimeout:     30 * time.Second,
		ApprovalTimeout:    30 * time.Second,
		AllowedServices:    []string{"web-research", "compute-cluster", "data-feed", "research-api"},
	}
}

// RunOptions configures an agent run execution.
type RunOptions struct {
	TaskID          string
	WaitForApproval bool
	ApprovalTimeout time.Duration
	AutoConfirm     bool
}

// ResearchAgent is the reference autonomous agent implementation for AgentPay.
// ZERO PRIVATE KEY INVARIANT:
// This agent possesses zero private keys, wallet signers, or direct contract interaction capabilities.
// It interacts strictly through AgentPay API / ToolExecutor.
type ResearchAgent struct {
	agentID      string
	orgID        string
	vaultAddress string
	model        AgentModel
	intentSvc    *intent.Service
	registry     *registry.Registry
	repo         storage.Repository
	provider     ExternalServiceProvider
	executor     *ToolExecutor
	safety       AgentSafetyConfig

	mu    sync.RWMutex
	tasks map[string]*AgentTaskExecutionResult
}

// NewResearchAgent constructs a new ResearchAgent.
func NewResearchAgent(
	agentID string,
	orgID string,
	vaultAddress string,
	model AgentModel,
	intentSvc *intent.Service,
	reg *registry.Registry,
	repo storage.Repository,
	provider ExternalServiceProvider,
	safety *AgentSafetyConfig,
) *ResearchAgent {
	if agentID == "" {
		agentID = "research-agent"
	}
	if orgID == "" {
		orgID = "org_default"
	}
	if vaultAddress == "" {
		vaultAddress = "0x1111111111111111111111111111111111111111"
	}
	if reg == nil {
		reg = registry.NewDefaultRegistry()
	}
	if provider == nil {
		provider = NewResearchDataProvider(intentSvc)
	}
	sConfig := DefaultSafetyConfig()
	if safety != nil {
		sConfig = *safety
	}

	executor := NewToolExecutor(reg, intentSvc, provider, agentID, vaultAddress)

	return &ResearchAgent{
		agentID:      agentID,
		orgID:        orgID,
		vaultAddress: vaultAddress,
		model:        model,
		intentSvc:    intentSvc,
		registry:     reg,
		repo:         repo,
		provider:     provider,
		executor:     executor,
		safety:       sConfig,
		tasks:        make(map[string]*AgentTaskExecutionResult),
	}
}

// RunTask executes the full autonomous agent workflow for a given user task.
func (a *ResearchAgent) RunTask(ctx context.Context, task AgentTask, opts RunOptions) (*AgentTaskExecutionResult, error) {
	startTime := time.Now()

	// 1. Task ID and Idempotency
	taskID := opts.TaskID
	if taskID == "" {
		taskID = generateTaskID()
	}

	a.mu.Lock()
	if existing, found := a.tasks[taskID]; found {
		a.mu.Unlock()
		return existing, nil
	}
	result := &AgentTaskExecutionResult{
		TaskID:    taskID,
		AgentID:   a.agentID,
		State:     StateThinking,
		Task:      task.Task,
		Steps:     make([]AgentStepRecord, 0),
		StartedAt: startTime,
	}
	a.tasks[taskID] = result
	a.mu.Unlock()

	// Audit: agent.task.started
	a.emitAudit(ctx, domain.AuditEventAgentTaskStarted, "TASK", taskID, map[string]interface{}{
		"task": task.Task,
	})

	// 2. Step: THINKING & MODEL EVALUATION
	stepStart := time.Now()
	aiResp, err := a.model.GeneratePaymentIntent(ctx, task)
	if err != nil {
		return a.failTask(ctx, result, fmt.Sprintf("AI reasoning failed: %v", err))
	}

	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   1,
		State:       StateThinking,
		Description: "Parsed user task and evaluated external paid service requirements",
		Output:      fmt.Sprintf("requires_payment=%v, service=%s", aiResp.RequiresPayment, aiResp.Service),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	// If no payment required, complete immediately
	if !aiResp.RequiresPayment {
		result.State = StateCompleted
		result.FinalReport = fmt.Sprintf("Task '%s' completed successfully without requiring external paid services.", task.Task)
		now := time.Now()
		result.CompletedAt = &now
		a.emitAudit(ctx, domain.AuditEventAgentTaskCompleted, "TASK", taskID, map[string]interface{}{
			"status": "COMPLETED_NO_PAYMENT",
		})
		return result, nil
	}

	// 3. Step: DISCOVERING_SERVICES via search_service tool
	result.State = StateDiscoveringServices
	stepStart = time.Now()
	discovered, err := a.executor.SearchService(ctx, SearchServiceInput{Query: aiResp.Service})
	if err != nil || len(discovered) == 0 {
		return a.failTask(ctx, result, fmt.Sprintf("service discovery failed or service '%s' not found", aiResp.Service))
	}

	selectedService := discovered[0]
	result.ServiceUsed = selectedService.ID
	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   2,
		State:       StateDiscoveringServices,
		ToolName:    ToolNameSearchService,
		Description: fmt.Sprintf("Discovered approved service: %s (%s, max_price: %s)", selectedService.ID, selectedService.Name, selectedService.MaxPrice),
		Input:       fmt.Sprintf("query=%s", aiResp.Service),
		Output:      fmt.Sprintf("found=%d services", len(discovered)),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	// Audit: agent.service.discovered
	a.emitAudit(ctx, domain.AuditEventAgentServiceDiscovered, "SERVICE", selectedService.ID, map[string]interface{}{
		"service_id": selectedService.ID,
		"max_price":  selectedService.MaxPrice,
	})

	// 4. Step: NEEDS_SERVICE & Safety Checks
	result.State = StateNeedsService
	if err := a.validateSafety(aiResp.Amount, selectedService.ID); err != nil {
		return a.failTask(ctx, result, fmt.Sprintf("safety check failed: %v", err))
	}

	// 5. Step: PAYMENT_REQUESTED via request_payment tool
	result.State = StatePaymentRequested
	stepStart = time.Now()

	payOut, err := a.executor.RequestPayment(ctx, RequestPaymentInput{
		ServiceID:     selectedService.ID,
		Amount:        aiResp.Amount,
		Asset:         aiResp.Asset,
		Purpose:       aiResp.Purpose,
		Justification: aiResp.Justification,
	})
	if err != nil {
		return a.failTask(ctx, result, fmt.Sprintf("request_payment failed: %v", err))
	}

	result.PaymentIntentID = payOut.PaymentIntentID
	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   3,
		State:       StatePaymentRequested,
		ToolName:    ToolNameRequestPayment,
		Description: fmt.Sprintf("Created payment intent %s for %s %s (Decision: %s)", payOut.PaymentIntentID, aiResp.Amount, aiResp.Asset, payOut.Decision),
		Input:       fmt.Sprintf("service=%s, amount=%s, asset=%s", selectedService.ID, aiResp.Amount, aiResp.Asset),
		Output:      fmt.Sprintf("status=%s, decision=%s, reason=%s", payOut.Status, payOut.Decision, payOut.Reason),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	// Audit: agent.payment.requested
	a.emitAudit(ctx, domain.AuditEventAgentPaymentRequested, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
		"amount":     aiResp.Amount,
		"service_id": selectedService.ID,
	})

	// 6. Step: Evaluate Policy & Risk Decision
	switch payOut.Decision {
	case "ALLOW":
		a.emitAudit(ctx, domain.AuditEventAgentPaymentAuthorized, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
			"decision": "ALLOW",
		})

		// Confirm payment on Arc
		if opts.AutoConfirm || a.intentSvc != nil {
			result.State = StateExecuting
			stepStart = time.Now()
			confirmedIntent, execRes, err := a.intentSvc.ConfirmIntent(ctx, payOut.PaymentIntentID)
			if err != nil {
				return a.failTask(ctx, result, fmt.Sprintf("execution failed: %v", err))
			}
			result.PaymentIntent = confirmedIntent
			txHash := ""
			if execRes != nil {
				txHash = execRes.TransactionHash
			}
			result.Steps = append(result.Steps, AgentStepRecord{
				StepIndex:   4,
				State:       StateExecuting,
				Description: fmt.Sprintf("Payment settled on Arc (tx: %s)", txHash),
				Output:      fmt.Sprintf("status=%s, txHash=%s", confirmedIntent.Status, txHash),
				Timestamp:   time.Now(),
				DurationMs:  time.Since(stepStart).Milliseconds(),
			})
			a.emitAudit(ctx, domain.AuditEventAgentPaymentConfirmed, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
				"tx_hash": txHash,
			})
		}

	case "APPROVAL_REQUIRED":
		result.State = StateWaitingForApproval
		a.emitAudit(ctx, domain.AuditEventAgentPaymentApprovalReq, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
			"reason": payOut.Reason,
		})

		if a.repo != nil {
			now := time.Now()
			_ = a.repo.SaveApproval(ctx, &storage.Approval{
				ID:              generateAuditID(),
				OrganizationID:  a.orgID,
				PaymentIntentID: payOut.PaymentIntentID,
				Required:        true,
				Status:          string(domain.ApprovalStatusPending),
				RequestedAt:     now,
				ExpiresAt:       now.Add(a.safety.ApprovalTimeout),
				CreatedAt:       now,
			})
		}

		result.Steps = append(result.Steps, AgentStepRecord{
			StepIndex:   4,
			State:       StateWaitingForApproval,
			Description: fmt.Sprintf("Payment requires human approval: %s", payOut.Reason),
			Output:      "status=APPROVAL_REQUIRED",
			Timestamp:   time.Now(),
		})

		if !opts.WaitForApproval {
			// Return task in WAITING_FOR_APPROVAL state for external or asynchronous approval
			return result, nil
		}

		// Bounded Polling with Backoff
		approvalTimeout := a.safety.ApprovalTimeout
		if opts.ApprovalTimeout > 0 {
			approvalTimeout = opts.ApprovalTimeout
		}

		pollCtx, cancel := context.WithTimeout(ctx, approvalTimeout)
		defer cancel()

		pollStart := time.Now()
		backoff := 50 * time.Millisecond
		approved := false

		for {
			select {
			case <-pollCtx.Done():
				return a.failTask(ctx, result, ErrApprovalTimeout.Error())
			default:
			}

			check, err := a.executor.CheckPayment(pollCtx, CheckPaymentInput{PaymentIntentID: payOut.PaymentIntentID})
			if err == nil {
				if check.Status == "APPROVED" {
					approved = true
					break
				}
				if check.Status == "REJECTED" || check.Status == "CANCELLED" || check.Status == "EXPIRED" {
					return a.failTask(ctx, result, fmt.Sprintf("payment was %s by human controller", check.Status))
				}
			}

			time.Sleep(backoff)
			if backoff < 500*time.Millisecond {
				backoff *= 2
			}
		}

		if approved {
			result.State = StateExecuting
			confirmedIntent, execRes, err := a.intentSvc.ConfirmIntent(ctx, payOut.PaymentIntentID)
			if err != nil {
				return a.failTask(ctx, result, fmt.Sprintf("execution after approval failed: %v", err))
			}
			result.PaymentIntent = confirmedIntent
			txHash := ""
			if execRes != nil {
				txHash = execRes.TransactionHash
			}
			result.Steps = append(result.Steps, AgentStepRecord{
				StepIndex:   5,
				State:       StateExecuting,
				Description: fmt.Sprintf("Approval granted; payment confirmed on Arc (tx: %s)", txHash),
				Output:      fmt.Sprintf("status=%s, txHash=%s", confirmedIntent.Status, txHash),
				Timestamp:   time.Now(),
				DurationMs:  time.Since(pollStart).Milliseconds(),
			})
			a.emitAudit(ctx, domain.AuditEventAgentPaymentConfirmed, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
				"tx_hash": txHash,
			})
		}

	case "DENY":
		a.emitAudit(ctx, domain.AuditEventAgentPaymentDenied, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
			"reason": payOut.Reason,
		})
		return a.failTask(ctx, result, fmt.Sprintf("payment denied by policy: %s", payOut.Reason))

	default:
		return a.failTask(ctx, result, fmt.Sprintf("unknown policy decision: %s", payOut.Decision))
	}

	// 7. Step: CONTINUING & PROCURING DATA FROM EXTERNAL SERVICE
	result.State = StateContinuing
	stepStart = time.Now()

	extData, err := a.provider.FetchCommercialData(ctx, payOut.PaymentIntentID, selectedService.ID, task.Task)
	if err != nil {
		return a.failTask(ctx, result, fmt.Sprintf("failed to fetch commercial data: %v", err))
	}

	result.ExternalData = extData.RawContent
	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   len(result.Steps) + 1,
		State:       StateContinuing,
		ToolName:    ToolNameContinueTask,
		Description: fmt.Sprintf("Retrieved commercial data payload from %s (Treated as untrusted DATA)", selectedService.ID),
		Input:       fmt.Sprintf("intent_id=%s, service=%s", payOut.PaymentIntentID, selectedService.ID),
		Output:      fmt.Sprintf("bytes=%d, is_mock=%v", len(extData.RawContent), extData.IsMock),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	// 8. Step: SYNTHESIS & FINAL REPORT
	// PROMPT INJECTION DEFENSE:
	// External data is treated strictly as data content. The agent synthesizes the findings.
	result.FinalReport = fmt.Sprintf(
		"# Autonomous Research Report: %s\n\n"+
			"**Executing Agent**: %s\n"+
			"**Service Utilized**: %s (%s)\n"+
			"**Payment Intent**: `%s` (Confirmed on Arc)\n"+
			"**Data Source**: %s\n\n"+
			"## Findings\n%s\n\n"+
			"## Conclusion\nResearch task completed successfully under deterministic AgentPay spending and policy controls.",
		task.Task, a.agentID, selectedService.Name, selectedService.ID, payOut.PaymentIntentID, extData.Source, extData.RawContent,
	)

	result.State = StateCompleted
	now := time.Now()
	result.CompletedAt = &now

	a.emitAudit(ctx, domain.AuditEventAgentTaskCompleted, "TASK", taskID, map[string]interface{}{
		"status":            "COMPLETED",
		"payment_intent_id": payOut.PaymentIntentID,
		"total_duration_ms": time.Since(startTime).Milliseconds(),
	})

	return result, nil
}

// GetTask retrieves the current state of a task by ID.
func (a *ResearchAgent) GetTask(taskID string) (*AgentTaskExecutionResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	res, found := a.tasks[taskID]
	if !found {
		return nil, storage.ErrNotFound
	}
	return res, nil
}

// validateSafety checks agent safety invariants before payment intent creation.
func (a *ResearchAgent) validateSafety(amountStr string, serviceID string) error {
	// 1. Check allowed services whitelist
	allowed := false
	for _, s := range a.safety.AllowedServices {
		if strings.EqualFold(s, serviceID) {
			allowed = true
			break
		}
	}
	if !allowed {
		return fmt.Errorf("%w: '%s'", ErrServiceNotAllowed, serviceID)
	}

	// 2. Check maximum payment amount cap
	amountBig, ok := new(big.Int).SetString(amountStr, 10)
	if !ok || amountBig.Sign() <= 0 {
		return ErrInvalidAmountFormat
	}
	capBig, ok := new(big.Int).SetString(a.safety.MaxPaymentAmount, 10)
	if ok && amountBig.Cmp(capBig) > 0 {
		return fmt.Errorf("%w: requested %s exceeds cap %s", ErrAmountAboveSafetyCap, amountStr, a.safety.MaxPaymentAmount)
	}

	return nil
}

func (a *ResearchAgent) failTask(ctx context.Context, result *AgentTaskExecutionResult, errMsg string) (*AgentTaskExecutionResult, error) {
	result.State = StateFailed
	result.Error = errMsg
	now := time.Now()
	result.CompletedAt = &now
	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   len(result.Steps) + 1,
		State:       StateFailed,
		Description: fmt.Sprintf("Task halted: %s", errMsg),
		Output:      "status=FAILED",
		Timestamp:   now,
	})
	a.emitAudit(ctx, domain.AuditEventAgentTaskCompleted, "TASK", result.TaskID, map[string]interface{}{
		"status": "FAILED",
		"error":  errMsg,
	})
	return result, errors.New(errMsg)
}

func (a *ResearchAgent) emitAudit(ctx context.Context, eventType domain.AuditEventType, resourceType, resourceID string, meta map[string]interface{}) {
	if a.repo == nil {
		return
	}
	metaBytes, _ := json.Marshal(meta)
	evt := &storage.AuditEvent{
		ID:             generateAuditID(),
		OrganizationID: a.orgID,
		EventType:      string(eventType),
		ActorType:      "AGENT",
		ActorID:        a.agentID,
		ResourceType:   resourceType,
		ResourceID:     resourceID,
		RequestID:      resourceID,
		Timestamp:      time.Now(),
		Metadata:       string(metaBytes),
	}
	_ = a.repo.SaveAuditEvent(ctx, evt)
}

func generateAuditID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("evt_%s", hex.EncodeToString(b))
}
