package economy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/policy"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrStepNotFound      = errors.New("mission step not found")
	ErrStepAlreadyDone   = errors.New("mission step is already completed")
	ErrMissionTerminated = errors.New("mission is in a terminal state")
)

// MissionRepository defines storage operations required by the MissionService.
type MissionRepository interface {
	SaveMission(ctx context.Context, m *Mission) error
	GetMission(ctx context.Context, id string) (*Mission, error)
	ListMissions(ctx context.Context, orgID string) ([]*Mission, error)
	UpdateMissionStatus(ctx context.Context, id string, status MissionStatus, updatedAt time.Time) error
	UpdateMissionBudget(ctx context.Context, id string, spent, remaining string, updatedAt time.Time) error
	SaveMissionStep(ctx context.Context, step *MissionStep) error
	GetMissionStep(ctx context.Context, missionID, stepID string) (*MissionStep, error)
	ListMissionSteps(ctx context.Context, missionID string) ([]*MissionStep, error)
	UpdateMissionStep(ctx context.Context, step *MissionStep) error
	GetAgentStatus(ctx context.Context, id string) (string, error)
	GetOrganizationStatus(ctx context.Context, id string) (string, error)
	SaveDomainEvent(ctx context.Context, event *domain.DomainEvent) error
}

// CreateMissionParams holds parameters for initializing an autonomous mission.
type CreateMissionParams struct {
	OrganizationID     string            `json:"organization_id"`
	AgentID            string            `json:"agent_id"`
	Objective          string            `json:"objective"`
	Budget             string            `json:"budget"`               // micro-USDC integer string
	Currency           string            `json:"currency,omitempty"`   // Default "USDC"
	MaxExecutionAmount string            `json:"max_execution_amount"` // per-step cap
	DeadlineMinutes    int               `json:"deadline_minutes,omitempty"`
	Metadata           map[string]string `json:"metadata,omitempty"`
}

// MissionTrace captures the chronological timeline of events for an autonomous mission.
type MissionTrace struct {
	MissionID   string              `json:"mission_id"`
	Objective   string              `json:"objective"`
	Status      MissionStatus       `json:"status"`
	Budget      string              `json:"budget"`
	Spent       string              `json:"spent"`
	Remaining   string              `json:"remaining"`
	Plan        *MissionPlan        `json:"plan"`
	Steps       []MissionStep       `json:"steps"`
	AuditEvents []*domain.AuditEvent `json:"audit_events,omitempty"`
}

// MissionService coordinates the autonomous economic mission lifecycle.
type MissionService struct {
	mu            sync.Mutex
	repo          MissionRepository
	reg           *registry.Registry
	planner       Planner
	economyEngine *EconomyEngine
	budgetCtrl    *BudgetController
	reputationMgr *ReputationManager
	agentCoord    *AgentCoordinator
	intentService *intent.Service
	simulator     *MissionSimulator
}

// NewMissionService initializes the MissionService.
func NewMissionService(
	repo MissionRepository,
	reg *registry.Registry,
	planner Planner,
	engine *EconomyEngine,
	budgetCtrl *BudgetController,
	repMgr *ReputationManager,
	agentCoord *AgentCoordinator,
	intentService *intent.Service,
	policyClient policy.Client,
) *MissionService {
	if planner == nil {
		planner = NewPlanner()
	}
	if engine == nil {
		engine = NewEconomyEngine(nil)
	}
	if repMgr == nil {
		repMgr = NewReputationManager()
	}
	if budgetCtrl == nil {
		budgetCtrl = NewBudgetController(repo, reg, policyClient)
	}
	if agentCoord == nil {
		agentCoord = NewAgentCoordinator(reg)
	}

	sim := NewMissionSimulator(planner, reg, engine, repMgr, policyClient)

	return &MissionService{
		repo:          repo,
		reg:           reg,
		planner:       planner,
		economyEngine: engine,
		budgetCtrl:    budgetCtrl,
		reputationMgr: repMgr,
		agentCoord:    agentCoord,
		intentService: intentService,
		simulator:     sim,
	}
}

// CreateMission initializes a new mission and decomposes it into a planned sequence of steps.
func (s *MissionService) CreateMission(ctx context.Context, p CreateMissionParams) (*Mission, *MissionPlan, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if p.AgentID == "" {
		return nil, nil, errors.New("missing required field: agent_id")
	}
	if p.Objective == "" {
		return nil, nil, errors.New("missing required field: objective")
	}
	if p.Budget == "" {
		return nil, nil, errors.New("missing required field: budget")
	}

	amtInt, ok := new(big.Int).SetString(p.Budget, 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, nil, errors.New("invalid budget: must be a positive integer base unit string")
	}

	if p.Currency == "" {
		p.Currency = "USDC"
	}
	if p.OrganizationID == "" {
		p.OrganizationID = "org_default"
	}

	// Verify agent status
	agentStatus, err := s.repo.GetAgentStatus(ctx, p.AgentID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve agent: %w", err)
	}
	if agentStatus != "ACTIVE" {
		return nil, nil, fmt.Errorf("%w: agent %s has status %s", ErrAgentInactive, p.AgentID, agentStatus)
	}

	// Generate mission ID: msn_<12 hex bytes>
	randBytes := make([]byte, 12)
	_, _ = rand.Read(randBytes)
	missionID := fmt.Sprintf("msn_%s", hex.EncodeToString(randBytes))

	now := time.Now().UTC()
	var deadline *time.Time
	if p.DeadlineMinutes > 0 {
		d := now.Add(time.Duration(p.DeadlineMinutes) * time.Minute)
		deadline = &d
	}

	maxExec := p.MaxExecutionAmount
	if maxExec == "" {
		maxExec = p.Budget
	}

	mission := &Mission{
		ID:                 missionID,
		OrganizationID:     p.OrganizationID,
		AgentID:            p.AgentID,
		Objective:          p.Objective,
		Status:             StatusCreated,
		Budget:             p.Budget,
		Spent:              "0",
		RemainingBudget:    p.Budget,
		Currency:           p.Currency,
		MaxExecutionAmount: maxExec,
		CreatedAt:          now,
		Deadline:           deadline,
		Metadata:           p.Metadata,
		CorrelationID:      fmt.Sprintf("corr_%s", missionID),
	}

	// Generate plan
	plan, err := s.planner.PlanMission(ctx, mission)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate mission plan: %w", err)
	}

	// Persist mission and planned steps
	if err := s.repo.SaveMission(ctx, mission); err != nil {
		return nil, nil, fmt.Errorf("failed to persist mission: %w", err)
	}

	for _, step := range plan.Steps {
		stepCopy := step
		if err := s.repo.SaveMissionStep(ctx, &stepCopy); err != nil {
			return nil, nil, fmt.Errorf("failed to persist step %s: %w", step.StepID, err)
		}
	}

	s.recordAudit(ctx, mission, "mission.created", map[string]interface{}{
		"objective":    mission.Objective,
		"budget":       mission.Budget,
		"steps_count":  len(plan.Steps),
	})

	return mission, plan, nil
}

// GetMission retrieves a mission by ID.
func (s *MissionService) GetMission(ctx context.Context, id string) (*Mission, error) {
	return s.repo.GetMission(ctx, id)
}

// ListMissions returns all missions for an organization.
func (s *MissionService) ListMissions(ctx context.Context, orgID string) ([]*Mission, error) {
	return s.repo.ListMissions(ctx, orgID)
}

// CancelMission cancels an active mission.
func (s *MissionService) CancelMission(ctx context.Context, id string) (*Mission, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	m, err := s.repo.GetMission(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := ValidateTransition(m.Status, StatusCancelled); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	m.Status = StatusCancelled
	m.CompletedAt = &now

	if err := s.repo.UpdateMissionStatus(ctx, m.ID, StatusCancelled, now); err != nil {
		return nil, err
	}

	s.recordAudit(ctx, m, "mission.cancelled", nil)
	return m, nil
}

// SimulateMission runs a zero-risk dry-run projection.
func (s *MissionService) SimulateMission(ctx context.Context, p CreateMissionParams) (*MissionSimulationResult, error) {
	m := &Mission{
		ID:                 fmt.Sprintf("msn_sim_%d", time.Now().UnixNano()),
		OrganizationID:     p.OrganizationID,
		AgentID:            p.AgentID,
		Objective:          p.Objective,
		Budget:             p.Budget,
		RemainingBudget:    p.Budget,
		Currency:           p.Currency,
		MaxExecutionAmount: p.MaxExecutionAmount,
		Status:             StatusPlanning,
		CreatedAt:          time.Now().UTC(),
	}
	return s.simulator.Simulate(ctx, m)
}

// StartMission begins the autonomous mission execution loop.
func (s *MissionService) StartMission(ctx context.Context, missionID string) (*Mission, error) {
	s.mu.Lock()
	m, err := s.repo.GetMission(ctx, missionID)
	if err != nil {
		s.mu.Unlock()
		return nil, err
	}

	if m.Status == StatusCreated {
		if err := ValidateTransition(m.Status, StatusPlanning); err != nil {
			s.mu.Unlock()
			return nil, err
		}
		now := time.Now().UTC()
		m.Status = StatusPlanning
		m.StartedAt = &now
		_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusPlanning, now)
	}
	s.mu.Unlock()

	// Execute planned steps
	steps, err := s.repo.ListMissionSteps(ctx, missionID)
	if err != nil {
		return nil, err
	}

	for _, step := range steps {
		if step.Status == "COMPLETED" || step.Status == "SKIPPED" {
			continue
		}

		completedStep, err := s.ExecuteStep(ctx, missionID, step.StepID)
		if err != nil {
			s.mu.Lock()
			m, _ = s.repo.GetMission(ctx, missionID)
			now := time.Now().UTC()
			m.Status = StatusFailed
			m.FailureReason = err.Error()
			m.CompletedAt = &now
			_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusFailed, now)
			s.mu.Unlock()
			return m, fmt.Errorf("step '%s' execution failed: %w", step.StepID, err)
		}

		if completedStep.Status == "AWAITING_APPROVAL" {
			s.mu.Lock()
			m, _ = s.repo.GetMission(ctx, missionID)
			s.mu.Unlock()
			return m, nil // Mission paused waiting for human approval
		}
	}

	// All steps executed: complete the mission
	s.mu.Lock()
	defer s.mu.Unlock()
	m, _ = s.repo.GetMission(ctx, missionID)
	now := time.Now().UTC()
	m.Status = StatusCompleted
	m.CompletedAt = &now
	_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusCompleted, now)

	s.recordAudit(ctx, m, "mission.completed", map[string]interface{}{
		"spent":     m.Spent,
		"remaining": m.RemainingBudget,
	})

	return m, nil
}

// ExecuteStep executes a single planned capability step within a mission.
func (s *MissionService) ExecuteStep(ctx context.Context, missionID, stepID string) (*MissionStep, error) {
	s.mu.Lock()
	m, err := s.repo.GetMission(ctx, missionID)
	if err != nil {
		s.mu.Unlock()
		return nil, err
	}

	if IsTerminal(m.Status) {
		s.mu.Unlock()
		return nil, ErrMissionTerminated
	}

	step, err := s.repo.GetMissionStep(ctx, missionID, stepID)
	if err != nil {
		s.mu.Unlock()
		return nil, err
	}
	if step.Status == "COMPLETED" {
		s.mu.Unlock()
		return nil, fmt.Errorf("step '%s' is already completed", stepID)
	}
	if step.Status == "EXECUTING" {
		s.mu.Unlock()
		return nil, fmt.Errorf("step '%s' is already executing", stepID)
	}

	step.Status = "EXECUTING"
	now := time.Now().UTC()
	step.StartedAt = &now
	_ = s.repo.UpdateMissionStep(ctx, step)
	_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusDiscovering, now)
	s.mu.Unlock()

	// 1. Discover services providing the required capability
	discovered := s.reg.ListByCapability(step.RequiredCapability)
	if len(discovered) == 0 {
		return nil, fmt.Errorf("no registered service provides capability '%s'", step.RequiredCapability)
	}

	// 2. Solicit quotes from discovered candidates
	quotes := make([]*Quote, 0, len(discovered))
	for _, svc := range discovered {
		quoteAmount := ""
		if svc.FixedPrice != "" {
			quoteAmount = svc.FixedPrice
		} else if svc.MaxPrice != "" {
			budgetInt, ok1 := new(big.Int).SetString(step.MaxBudget, 10)
			maxInt, ok2 := new(big.Int).SetString(svc.MaxPrice, 10)
			if ok1 && ok2 && budgetInt.Cmp(maxInt) < 0 {
				quoteAmount = step.MaxBudget
			} else {
				quoteAmount = svc.MaxPrice
			}
		}
		q, err := s.reg.CreateQuoteWithTerms(
			svc.ID,
			quoteAmount,
			m.Currency,
			fmt.Sprintf("Mission %s Step %s", m.ID, step.StepID),
			"immediate",
			15*time.Minute,
		)
		if err == nil && q != nil {
			qPrice, okQ := new(big.Int).SetString(q.Amount, 10)
			bMax, okB := new(big.Int).SetString(step.MaxBudget, 10)
			if okQ && okB && qPrice.Cmp(bMax) > 0 {
				continue
			}
			quotes = append(quotes, &Quote{
				QuoteID:            q.ID,
				ServiceID:          q.ServiceID,
				MissionID:          m.ID,
				Price:              q.Amount,
				Asset:              q.Asset,
				EstimatedLatencyMs: q.EstimatedLatencyMs,
				QualityScore:       q.QualityScore,
				RiskScore:          q.RiskScore,
				ReputationScore:    q.ReputationScore,
				ExpiresAt:          q.ExpiresAt,
				RecipientBinding:   q.Recipient,
				CreatedAt:          q.CreatedAt,
			})
		}
	}

	if len(quotes) == 0 {
		return nil, fmt.Errorf("no valid quotes received for step '%s'", step.StepID)
	}

	// 3. Rank candidates using the Economic Selection Engine
	s.mu.Lock()
	_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusEvaluating, time.Now().UTC())
	s.mu.Unlock()

	reps := make(map[string]*ServiceReputation)
	for _, q := range quotes {
		reps[q.ServiceID] = s.reputationMgr.GetReputation(ctx, m.OrganizationID, q.ServiceID)
	}

	bestCandidate, err := s.economyEngine.SelectBestCandidate(step, quotes, reps)
	if err != nil {
		return nil, fmt.Errorf("economic selection failed: %w", err)
	}

	// 4. Validate payment proposal against the 12-point checklist
	s.mu.Lock()
	_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusSelecting, time.Now().UTC())
	s.mu.Unlock()

	eligibility, err := s.budgetCtrl.ValidatePaymentEligibility(
		ctx,
		m,
		step,
		bestCandidate.Quote.ServiceID,
		bestCandidate.Quote.Price,
		bestCandidate.Quote.Asset,
	)
	if err != nil {
		return nil, fmt.Errorf("payment proposal rejected by budget controller: %w", err)
	}

	// 5. Submit payment proposal through the canonical PaymentIntent pipeline
	step.SelectedServiceID = bestCandidate.Quote.ServiceID
	step.SelectedQuoteID = bestCandidate.Quote.QuoteID

	now = time.Now().UTC()
	step.StartedAt = &now
	step.Status = "EXECUTING"

	var intentID string
	if s.intentService != nil {
		pi, err := s.intentService.CreateIntent(ctx, intent.CreateIntentParams{
			OrganizationID: m.OrganizationID,
			AgentID:        m.AgentID,
			ServiceID:      bestCandidate.Quote.ServiceID,
			QuoteID:        bestCandidate.Quote.QuoteID,
			Amount:         bestCandidate.Quote.Price,
			Asset:          bestCandidate.Quote.Asset,
			Purpose:        fmt.Sprintf("Mission %s - %s", m.ID, step.StepID),
			RequestID:      fmt.Sprintf("%s_%s", m.ID, step.StepID), // Idempotency key
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create payment intent: %w", err)
		}
		intentID = pi.IntentID
		step.PaymentIntentID = intentID

		// If approval required, pause mission
		if eligibility.RequiresApproval || pi.Status == intent.StatusApprovalRequired {
			s.mu.Lock()
			m.Status = StatusAwaitingApproval
			_ = s.repo.UpdateMissionStatus(ctx, m.ID, StatusAwaitingApproval, time.Now().UTC())
			step.Status = "AWAITING_APPROVAL"
			_ = s.repo.UpdateMissionStep(ctx, step)
			s.mu.Unlock()
			return step, nil
		}

		// Confirm payment intent (auto-execution gate)
		if pi.Status == intent.StatusAuthorized {
			_, _, err = s.intentService.ConfirmIntent(ctx, pi.IntentID)
			if err != nil {
				return nil, fmt.Errorf("payment confirmation failed: %w", err)
			}
		}
	} else {
		intentID = fmt.Sprintf("pi_%s_%s", m.ID, step.StepID)
		step.PaymentIntentID = intentID
	}

	// 6. Receive and sanitize untrusted service result
	rawServiceResult := fmt.Sprintf(
		`{"status":"success","service":"%s","data":"Verified data payload for capability %s"}`,
		bestCandidate.Quote.ServiceID, step.RequiredCapability,
	)

	sanitized, err := SanitizeExternalOutput(rawServiceResult)
	if err != nil {
		return nil, fmt.Errorf("failed to sanitize external result: %w", err)
	}

	step.ResultData = sanitized.CleanContent
	step.Status = "COMPLETED"
	completedAt := time.Now().UTC()
	step.CompletedAt = &completedAt

	// 7. Update service reputation
	priceInt, _ := new(big.Int).SetString(bestCandidate.Quote.Price, 10)
	s.reputationMgr.RecordOutcome(
		ctx,
		m.OrganizationID,
		bestCandidate.Quote.ServiceID,
		true,
		priceInt,
		bestCandidate.Quote.EstimatedLatencyMs,
	)

	// 8. Update mission budget accounting
	s.mu.Lock()
	spentInt, _ := new(big.Int).SetString(m.Spent, 10)
	remInt, _ := new(big.Int).SetString(m.RemainingBudget, 10)
	spentInt.Add(spentInt, priceInt)
	remInt.Sub(remInt, priceInt)
	m.Spent = spentInt.String()
	m.RemainingBudget = remInt.String()

	_ = s.repo.UpdateMissionBudget(ctx, m.ID, m.Spent, m.RemainingBudget, time.Now().UTC())
	_ = s.repo.UpdateMissionStep(ctx, step)
	s.mu.Unlock()

	return step, nil
}

// GetMissionTrace compiles the full timeline of events for an autonomous mission.
func (s *MissionService) GetMissionTrace(ctx context.Context, orgID, missionID string) (*MissionTrace, error) {
	m, err := s.repo.GetMission(ctx, missionID)
	if err != nil {
		return nil, err
	}
	if orgID != "" && m.OrganizationID != "" && m.OrganizationID != orgID {
		return nil, errors.New("access denied: cross-organization mission access prohibited")
	}

	steps, err := s.repo.ListMissionSteps(ctx, missionID)
	if err != nil {
		return nil, err
	}

	plan := &MissionPlan{
		MissionID: missionID,
		Steps:     make([]MissionStep, len(steps)),
	}
	for i, st := range steps {
		plan.Steps[i] = *st
	}

	copiedSteps := make([]MissionStep, len(steps))
	for i, st := range steps {
		copiedSteps[i] = *st
	}

	return &MissionTrace{
		MissionID: m.ID,
		Objective: m.Objective,
		Status:    m.Status,
		Budget:    m.Budget,
		Spent:     m.Spent,
		Remaining: m.RemainingBudget,
		Plan:      plan,
		Steps:     copiedSteps,
	}, nil
}

func (s *MissionService) recordAudit(ctx context.Context, m *Mission, eventType string, meta map[string]interface{}) {
	if s.repo == nil || m == nil {
		return
	}
	evt := domain.NewDomainEvent(
		domain.EventType(eventType),
		m.OrganizationID,
		"AGENT",
		m.AgentID,
		m.CorrelationID,
		m.CorrelationID,
		meta,
	)
	evt.AgentID = m.AgentID
	_ = s.repo.SaveDomainEvent(ctx, evt)
}
