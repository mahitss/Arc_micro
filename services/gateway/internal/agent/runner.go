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
	ErrTaskTimeout                = errors.New("agent task execution exceeded timeout")
	ErrApprovalTimeout            = errors.New("timed out waiting for human approval")
	ErrMaxPaymentAttemptsExceeded = errors.New("maximum payment attempts exceeded for task")
	ErrAmountAboveSafetyCap       = errors.New("requested amount exceeds agent safety cap")
	ErrServiceNotAllowed          = errors.New("requested service is not in agent allowed services list")
	ErrNoViableQuotes             = errors.New("no viable unexpired quotes found within budget")
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
		AllowedServices:    []string{"web-research", "compute-cluster", "data-feed", "research-api", "oracle-network"},
	}
}

// RunOptions configures an agent run execution.
type RunOptions struct {
	TaskID          string
	WaitForApproval bool
	ApprovalTimeout time.Duration
	AutoConfirm     bool
}

// MultiStepTask defines an autonomous multi-service workflow.
type MultiStepTask struct {
	TaskID  string
	Task    string
	AgentID string
	Steps   []TaskStepRequirement
}

// TaskStepRequirement defines one required capability/service in a multi-step task.
type TaskStepRequirement struct {
	StepName   string
	Capability string
	Service    string
	Amount     string
	Asset      string
	Purpose    string
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
	budget       *AgentBudget

	mu       sync.RWMutex
	tasks    map[string]*AgentTaskExecutionResult
	memories map[string]*TaskEconomicMemory
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

	// Default budget: 10,000,000 micro-USDC ($10.00)
	defaultBudget := NewAgentBudget(agentID, big.NewInt(10000000))
	executor.SetBudget(defaultBudget)

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
		budget:       defaultBudget,
		tasks:        make(map[string]*AgentTaskExecutionResult),
		memories:     make(map[string]*TaskEconomicMemory),
	}
}

// SetBudget overrides the agent's economic budget.
func (a *ResearchAgent) SetBudget(b *AgentBudget) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.budget = b
	if a.executor != nil {
		a.executor.SetBudget(b)
	}
}

// Budget returns the agent's current economic budget.
func (a *ResearchAgent) Budget() *AgentBudget {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.budget
}

// GetMemory retrieves task economic memory by task ID.
func (a *ResearchAgent) GetMemory(taskID string) *TaskEconomicMemory {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.memories[taskID]
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

	// Initialize Task Economic Memory
	mem := NewTaskEconomicMemory(taskID, a.agentID, a.budget.BudgetLimit)
	a.memories[taskID] = mem
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
		result.BudgetRemaining = a.budget.Available().String()
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

	mem.RecordDiscovered(discovered)

	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   2,
		State:       StateDiscoveringServices,
		ToolName:    ToolNameSearchService,
		Description: fmt.Sprintf("Discovered %d candidate services for query '%s'", len(discovered), aiResp.Service),
		Input:       fmt.Sprintf("query=%s", aiResp.Service),
		Output:      fmt.Sprintf("found=%d services", len(discovered)),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	for _, s := range discovered {
		a.emitAudit(ctx, domain.AuditEventAgentServiceDiscovered, "SERVICE", s.ID, map[string]interface{}{
			"service_id": s.ID,
			"max_price":  s.MaxPrice,
			"trust":      s.TrustStatus,
		})
	}

	// 4. Step: OBTAIN QUOTES for candidate services
	var candidateQuotes []*GetQuoteOutput
	var candidateIDs []string
	for _, s := range discovered {
		candidateIDs = append(candidateIDs, s.ID)
		q, err := a.executor.GetQuote(ctx, GetQuoteInput{
			ServiceID:       s.ID,
			RequestedAmount: aiResp.Amount,
			Asset:           aiResp.Asset,
			Purpose:         aiResp.Purpose,
		})
		if err == nil && q != nil {
			candidateQuotes = append(candidateQuotes, q)
			if regQ, err := a.registry.GetQuote(q.QuoteID); err == nil && regQ != nil {
				mem.RecordQuote(regQ)
			}
			a.emitAudit(ctx, domain.AuditEventAgentQuoteReceived, "QUOTE", q.QuoteID, map[string]interface{}{
				"service_id": q.ServiceID,
				"amount":     q.Amount,
				"asset":      q.Asset,
				"expires_at": q.ExpiresAt,
			})
		}
	}

	if len(candidateQuotes) == 0 {
		return a.failTask(ctx, result, fmt.Sprintf("no valid quotes received for service '%s'", aiResp.Service))
	}

	// 5. Step: COST-AWARE ECONOMIC SELECTION & BUDGET EVALUATION
	result.State = StateNeedsService
	stepStart = time.Now()

	budgetBefore := a.budget.Available()

	// Heuristic:
	// 1. Must not be expired
	// 2. Must be affordable within agent available budget
	// 3. Prefer TRUSTED / VERIFIED over UNVERIFIED
	// 4. Choose lowest cost quote among preferred tier
	var selectedQuote *GetQuoteOutput
	var selectedService *DiscoveredService
	var bestAmount *big.Int

	for _, q := range candidateQuotes {
		// Check expiry
		expTime, parseErr := time.Parse(time.RFC3339, q.ExpiresAt)
		if parseErr == nil && time.Now().After(expTime) {
			continue
		}

		qAmt, ok := new(big.Int).SetString(q.Amount, 10)
		if !ok || qAmt.Sign() <= 0 {
			continue
		}

		// Check budget affordability
		if !a.budget.CanAfford(qAmt) {
			continue
		}

		// Lookup discovered service metadata
		var candidateService *DiscoveredService
		for _, s := range discovered {
			if s.ID == q.ServiceID {
				candidateService = &s
				break
			}
		}
		if candidateService == nil || candidateService.TrustStatus == "DISABLED" {
			continue
		}

		if selectedQuote == nil {
			selectedQuote = q
			selectedService = candidateService
			bestAmount = qAmt
		} else {
			// Compare trust hierarchy then cost
			currTrust := candidateService.TrustStatus == "TRUSTED" || candidateService.TrustStatus == "VERIFIED"
			prevTrust := selectedService.TrustStatus == "TRUSTED" || selectedService.TrustStatus == "VERIFIED"

			if currTrust && !prevTrust {
				selectedQuote = q
				selectedService = candidateService
				bestAmount = qAmt
			} else if currTrust == prevTrust && qAmt.Cmp(bestAmount) < 0 {
				selectedQuote = q
				selectedService = candidateService
				bestAmount = qAmt
			}
		}
	}

	if selectedQuote == nil {
		candAmt, _ := new(big.Int).SetString(candidateQuotes[0].Amount, 10)
		if !a.budget.CanAfford(candAmt) {
			return a.failTask(ctx, result, fmt.Sprintf("insufficient budget: available %s micro-USDC, lowest quote requires %s",
				a.budget.Available().String(), candidateQuotes[0].Amount))
		}
		return a.failTask(ctx, result, ErrNoViableQuotes.Error())
	}

	result.ServiceUsed = selectedService.ID

	// Safety cap check
	if err := a.validateSafety(selectedQuote.Amount, selectedService.ID); err != nil {
		return a.failTask(ctx, result, fmt.Sprintf("safety check failed: %v", err))
	}

	budgetAfter := new(big.Int).Sub(budgetBefore, bestAmount)
	if budgetAfter.Sign() < 0 {
		budgetAfter.SetInt64(0)
	}

	// Economic decision explanation
	rationale := fmt.Sprintf("Selected service %s: lowest quote (%s %s, est: %s, reliability: %s) among %d candidate(s) within budget (%s available)",
		selectedService.ID, selectedQuote.Amount, selectedQuote.Asset, selectedQuote.EstimatedDelivery, selectedService.HistoricalReliability,
		len(candidateQuotes), a.budget.Available().String())

	mem.RecordDecision(EconomicDecisionLog{
		TaskContext:         task.Task,
		RequiredCapability:  aiResp.Service,
		Candidates:          candidateIDs,
		SelectedServiceID:   selectedService.ID,
		SelectedQuoteID:     selectedQuote.QuoteID,
		CostBaseUnits:       selectedQuote.Amount,
		BudgetBefore:        budgetBefore.String(),
		BudgetAfter:         budgetAfter.String(),
		DecisionExplanation: rationale,
		Timestamp:           time.Now(),
	})

	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   3,
		State:       StateNeedsService,
		Description: fmt.Sprintf("Economic decision: %s", rationale),
		Input:       fmt.Sprintf("candidates=%d, budget_available=%s", len(candidateQuotes), a.budget.Available().String()),
		Output:      fmt.Sprintf("selected_service=%s, quote_id=%s, amount=%s", selectedService.ID, selectedQuote.QuoteID, selectedQuote.Amount),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	// 6. Step: PAYMENT_REQUESTED via request_payment tool with QuoteID binding
	// Note: RequestPayment internally validates and reserves budget on the executor.
	result.State = StatePaymentRequested
	stepStart = time.Now()

	payOut, err := a.executor.RequestPayment(ctx, RequestPaymentInput{
		ServiceID:     selectedService.ID,
		QuoteID:       selectedQuote.QuoteID,
		Amount:        selectedQuote.Amount,
		Asset:         selectedQuote.Asset,
		Purpose:       selectedQuote.Purpose,
		Justification: aiResp.Justification,
	})
	if err != nil {
		mem.RecordPaymentOutcome(selectedQuote.QuoteID, bestAmount, false)
		return a.failTask(ctx, result, fmt.Sprintf("request_payment failed: %v", err))
	}

	result.PaymentIntentID = payOut.PaymentIntentID
	result.Steps = append(result.Steps, AgentStepRecord{
		StepIndex:   4,
		State:       StatePaymentRequested,
		ToolName:    ToolNameRequestPayment,
		Description: fmt.Sprintf("Created quote-bound payment intent %s for %s %s (Quote: %s, Decision: %s)", payOut.PaymentIntentID, selectedQuote.Amount, selectedQuote.Asset, selectedQuote.QuoteID, payOut.Decision),
		Input:       fmt.Sprintf("service=%s, quote_id=%s, amount=%s, asset=%s", selectedService.ID, selectedQuote.QuoteID, selectedQuote.Amount, selectedQuote.Asset),
		Output:      fmt.Sprintf("status=%s, decision=%s, reason=%s", payOut.Status, payOut.Decision, payOut.Reason),
		Timestamp:   time.Now(),
		DurationMs:  time.Since(stepStart).Milliseconds(),
	})

	// Audit: agent.payment.requested
	a.emitAudit(ctx, domain.AuditEventAgentPaymentRequested, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
		"amount":     selectedQuote.Amount,
		"service_id": selectedService.ID,
		"quote_id":   selectedQuote.QuoteID,
	})

	// 7. Step: Evaluate Policy & Risk Decision
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
				_ = a.budget.Release(bestAmount)
				mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, false)
				return a.failTask(ctx, result, fmt.Sprintf("execution failed: %v", err))
			}
			result.PaymentIntent = confirmedIntent
			txHash := ""
			if execRes != nil {
				txHash = execRes.TransactionHash
			}

			// Finalize spend in budget
			_ = a.budget.Spend(bestAmount)
			mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, true)

			result.Steps = append(result.Steps, AgentStepRecord{
				StepIndex:   5,
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
			StepIndex:   5,
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
				_ = a.budget.Release(bestAmount)
				mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, false)
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
					_ = a.budget.Release(bestAmount)
					mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, false)
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
				_ = a.budget.Release(bestAmount)
				mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, false)
				return a.failTask(ctx, result, fmt.Sprintf("execution after approval failed: %v", err))
			}
			result.PaymentIntent = confirmedIntent
			txHash := ""
			if execRes != nil {
				txHash = execRes.TransactionHash
			}

			// Finalize spend in budget
			_ = a.budget.Spend(bestAmount)
			mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, true)

			result.Steps = append(result.Steps, AgentStepRecord{
				StepIndex:   6,
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
		_ = a.budget.Release(bestAmount)
		mem.RecordPaymentOutcome(payOut.PaymentIntentID, bestAmount, false)
		a.emitAudit(ctx, domain.AuditEventAgentPaymentDenied, "PAYMENT_INTENT", payOut.PaymentIntentID, map[string]interface{}{
			"reason": payOut.Reason,
		})
		return a.failTask(ctx, result, fmt.Sprintf("payment denied by policy: %s", payOut.Reason))

	default:
		_ = a.budget.Release(bestAmount)
		return a.failTask(ctx, result, fmt.Sprintf("unknown policy decision: %s", payOut.Decision))
	}

	// 8. Step: CONTINUING & PROCURING DATA FROM EXTERNAL SERVICE
	result.State = StateContinuing
	stepStart = time.Now()

	extData, err := a.provider.FetchCommercialData(ctx, payOut.PaymentIntentID, selectedService.ID, task.Task)
	if err != nil {
		return a.failTask(ctx, result, fmt.Sprintf("failed to fetch commercial data: %v", err))
	}

	// PROMPT INJECTION DEFENSE & TRUST BOUNDARY:
	// External service output is treated STRICTLY AS DATA.
	// Malicious instructions in extData.RawContent cannot modify policy, recipient, budget, or execute payments.
	result.ExternalData = extData.RawContent
	mem.RecordResult(*extData)

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

	// 9. Step: SYNTHESIS & FINAL REPORT
	result.Decisions = mem.Decisions
	result.BudgetRemaining = a.budget.Available().String()

	result.FinalReport = fmt.Sprintf(
		"# Autonomous Research Report: %s\n\n"+
			"**Executing Agent**: %s\n"+
			"**Service Utilized**: %s (%s)\n"+
			"**Quote ID**: `%s`\n"+
			"**Payment Intent**: `%s` (Confirmed on Arc)\n"+
			"**Data Source**: %s\n\n"+
			"## Economic Summary\n"+
			"- **Initial Budget Limit**: %s micro-USDC\n"+
			"- **Total Spent**: %s micro-USDC\n"+
			"- **Remaining Budget**: %s micro-USDC\n"+
			"- **Economic Rationale**: %s\n\n"+
			"## Findings\n%s\n\n"+
			"## Conclusion\nResearch task completed successfully under deterministic AgentPay spending and policy controls.",
		task.Task, a.agentID, selectedService.Name, selectedService.ID, selectedQuote.QuoteID, payOut.PaymentIntentID,
		extData.Source, a.budget.BudgetLimit.String(), a.budget.Spent.String(), result.BudgetRemaining, rationale, extData.RawContent,
	)

	result.State = StateCompleted
	now := time.Now()
	result.CompletedAt = &now

	a.emitAudit(ctx, domain.AuditEventAgentTaskCompleted, "TASK", taskID, map[string]interface{}{
		"status":            "COMPLETED",
		"payment_intent_id": payOut.PaymentIntentID,
		"quote_id":          selectedQuote.QuoteID,
		"total_spent":       selectedQuote.Amount,
		"budget_remaining":  result.BudgetRemaining,
		"total_duration_ms": time.Since(startTime).Milliseconds(),
	})

	return result, nil
}

// RunMultiStepTask executes a complex workflow requiring sequential external services.
// CRITICAL INVARIANT:
// Each payment independently passes through AgentPay policy, risk, and treasury verification.
// Payment A cannot authorize Payment B. The total task cost must strictly remain within budget.
func (a *ResearchAgent) RunMultiStepTask(ctx context.Context, multiTask MultiStepTask, opts RunOptions) (*AgentTaskExecutionResult, error) {
	startTime := time.Now()
	taskID := opts.TaskID
	if taskID == "" {
		taskID = generateTaskID()
	}

	result := &AgentTaskExecutionResult{
		TaskID:    taskID,
		AgentID:   a.agentID,
		State:     StateThinking,
		Task:      multiTask.Task,
		Steps:     make([]AgentStepRecord, 0),
		StartedAt: startTime,
	}

	mem := NewTaskEconomicMemory(taskID, a.agentID, a.budget.BudgetLimit)
	a.mu.Lock()
	a.tasks[taskID] = result
	a.memories[taskID] = mem
	a.mu.Unlock()

	var completedFindings []string

	for i, stepReq := range multiTask.Steps {
		stepIndex := i + 1
		query := stepReq.Service
		if query == "" {
			query = stepReq.Capability
		}

		// 1. Service Discovery
		discovered, err := a.executor.SearchService(ctx, SearchServiceInput{
			Query:      query,
			Capability: stepReq.Capability,
		})
		if err != nil || len(discovered) == 0 {
			return a.failTask(ctx, result, fmt.Sprintf("multi-step step %d (%s) failed: no services discovered", stepIndex, stepReq.StepName))
		}
		mem.RecordDiscovered(discovered)

		// 2. Get Quotes
		var quotes []*GetQuoteOutput
		for _, s := range discovered {
			q, err := a.executor.GetQuote(ctx, GetQuoteInput{
				ServiceID:       s.ID,
				RequestedAmount: stepReq.Amount,
				Asset:           stepReq.Asset,
				Purpose:         stepReq.Purpose,
			})
			if err == nil && q != nil {
				quotes = append(quotes, q)
				if regQ, err := a.registry.GetQuote(q.QuoteID); err == nil && regQ != nil {
					mem.RecordQuote(regQ)
				}
			}
		}
		if len(quotes) == 0 {
			return a.failTask(ctx, result, fmt.Sprintf("multi-step step %d (%s) failed: no valid quotes", stepIndex, stepReq.StepName))
		}

		// 3. Select lowest cost viable quote within remaining budget
		var chosenQuote *GetQuoteOutput
		var chosenService *DiscoveredService
		for _, q := range quotes {
			expTime, parseErr := time.Parse(time.RFC3339, q.ExpiresAt)
			if parseErr == nil && time.Now().After(expTime) {
				continue
			}
			qAmt, ok := new(big.Int).SetString(q.Amount, 10)
			if !ok || !a.budget.CanAfford(qAmt) {
				continue
			}
			for _, s := range discovered {
				if s.ID == q.ServiceID && s.TrustStatus != "DISABLED" {
					if chosenQuote == nil {
						chosenQuote = q
						chosenService = &s
					} else {
						cAmt, _ := new(big.Int).SetString(chosenQuote.Amount, 10)
						if qAmt.Cmp(cAmt) < 0 {
							chosenQuote = q
							chosenService = &s
						}
					}
				}
			}
		}

		if chosenQuote == nil {
			return a.failTask(ctx, result, fmt.Sprintf("multi-step step %d (%s) budget exceeded: remaining %s cannot afford step quotes",
				stepIndex, stepReq.StepName, a.budget.Available().String()))
		}

		chosenAmt, _ := new(big.Int).SetString(chosenQuote.Amount, 10)

		// 4. Request payment intent independently (RequestPayment reserves on budget)
		payOut, err := a.executor.RequestPayment(ctx, RequestPaymentInput{
			ServiceID:     chosenService.ID,
			QuoteID:       chosenQuote.QuoteID,
			Amount:        chosenQuote.Amount,
			Asset:         chosenQuote.Asset,
			Purpose:       chosenQuote.Purpose,
			Justification: fmt.Sprintf("Multi-step task step %d: %s", stepIndex, stepReq.StepName),
		})
		if err != nil {
			return a.failTask(ctx, result, fmt.Sprintf("step %d payment request failed: %v", stepIndex, err))
		}

		if payOut.Decision == "DENY" {
			_ = a.budget.Release(chosenAmt)
			return a.failTask(ctx, result, fmt.Sprintf("step %d payment denied by policy: %s", stepIndex, payOut.Reason))
		}

		// 5. Confirm on Arc
		if opts.AutoConfirm || a.intentSvc != nil {
			_, _, err := a.intentSvc.ConfirmIntent(ctx, payOut.PaymentIntentID)
			if err != nil {
				_ = a.budget.Release(chosenAmt)
				return a.failTask(ctx, result, fmt.Sprintf("step %d execution failed: %v", stepIndex, err))
			}
			_ = a.budget.Spend(chosenAmt)
			mem.RecordPaymentOutcome(payOut.PaymentIntentID, chosenAmt, true)
		}

		// 6. Fetch commercial data
		extData, err := a.provider.FetchCommercialData(ctx, payOut.PaymentIntentID, chosenService.ID, multiTask.Task)
		if err != nil {
			return a.failTask(ctx, result, fmt.Sprintf("step %d commercial data fetch failed: %v", stepIndex, err))
		}
		mem.RecordResult(*extData)
		completedFindings = append(completedFindings, fmt.Sprintf("### Step %d: %s (%s)\n%s", stepIndex, stepReq.StepName, chosenService.ID, extData.RawContent))

		rationale := fmt.Sprintf("Step %d (%s) procured %s for %s %s", stepIndex, stepReq.StepName, chosenService.ID, chosenQuote.Amount, chosenQuote.Asset)
		mem.RecordDecision(EconomicDecisionLog{
			TaskContext:         multiTask.Task,
			RequiredCapability:  stepReq.Capability,
			Candidates:          []string{chosenService.ID},
			SelectedServiceID:   chosenService.ID,
			SelectedQuoteID:     chosenQuote.QuoteID,
			CostBaseUnits:       chosenQuote.Amount,
			DecisionExplanation: rationale,
			Timestamp:           time.Now(),
		})

		result.Steps = append(result.Steps, AgentStepRecord{
			StepIndex:   stepIndex,
			State:       StateContinuing,
			Description: rationale,
			Output:      fmt.Sprintf("intent=%s, settled=true", payOut.PaymentIntentID),
			Timestamp:   time.Now(),
		})
	}

	result.State = StateCompleted
	result.Decisions = mem.Decisions
	result.BudgetRemaining = a.budget.Available().String()
	result.FinalReport = fmt.Sprintf(
		"# Multi-Service Autonomous Report: %s\n\n"+
			"## Economic Summary\n"+
			"- **Initial Budget**: %s micro-USDC\n"+
			"- **Total Spent**: %s micro-USDC\n"+
			"- **Remaining Budget**: %s micro-USDC\n"+
			"- **Services Procured**: %d\n\n"+
			"## Sequential Findings\n\n%s\n\n"+
			"## Conclusion\nMulti-service workflow executed successfully under deterministic AgentPay control.",
		multiTask.Task, a.budget.BudgetLimit.String(), a.budget.Spent.String(), result.BudgetRemaining, len(multiTask.Steps), strings.Join(completedFindings, "\n\n"),
	)
	now := time.Now()
	result.CompletedAt = &now

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
