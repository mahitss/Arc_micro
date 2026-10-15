package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/trust"
)

// TrustHandler provides HTTP endpoints for the Red-Team Suite, Tamper-Evident Audit Chain, and Verifiable Trust Engine.
type TrustHandler struct {
	chain        *trust.AuditChain
	engine       *trust.TrustEngine
	suite        *trust.RedTeamSuite
	reg          *registry.Registry
	mu           sync.RWMutex
	cachedReport *trust.RedTeamReport
	lastRunAt    time.Time
}

// NewTrustHandler constructs a new TrustHandler.
func NewTrustHandler(chain *trust.AuditChain, engine *trust.TrustEngine, suite *trust.RedTeamSuite, reg *registry.Registry) *TrustHandler {
	if chain == nil {
		chain = trust.NewAuditChain()
	}
	if engine == nil {
		engine = trust.NewTrustEngine(chain)
	}
	if suite == nil {
		suite = trust.NewRedTeamSuite(chain, reg)
	}
	return &TrustHandler{
		chain:  chain,
		engine: engine,
		suite:  suite,
		reg:    reg,
	}
}

// HandleGetRedTeamReport returns the cached or freshly executed Red-Team report.
func (h *TrustHandler) HandleGetRedTeamReport(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	report := h.cachedReport
	h.mu.RUnlock()

	if report == nil {
		res := h.suite.RunAll(r.Context())
		h.mu.Lock()
		h.cachedReport = &res
		h.lastRunAt = time.Now()
		report = &res
		h.mu.Unlock()
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(report)
}

// HandleRunRedTeam deterministically executes all 9 red-team attack vectors without executing payments.
func (h *TrustHandler) HandleRunRedTeam(w http.ResponseWriter, r *http.Request) {
	res := h.suite.RunAll(r.Context())

	h.mu.Lock()
	h.cachedReport = &res
	h.lastRunAt = time.Now()
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// AuditChainResponse represents the chain state and its cryptographic verification.
type AuditChainResponse struct {
	TotalEvents  int                         `json:"total_events"`
	Verification *trust.ChainVerificationResult `json:"verification"`
	Nodes        []*trust.AuditEventNode     `json:"nodes"`
	ThreatModel  string                      `json:"threat_model"`
}

// HandleGetAuditChain returns the recorded tamper-evident audit chain nodes and cryptographic verification.
func (h *TrustHandler) HandleGetAuditChain(w http.ResponseWriter, r *http.Request) {
	nodes := h.chain.GetNodes()
	verif := h.chain.VerifyChain()

	resp := AuditChainResponse{
		TotalEvents:  len(nodes),
		Verification: verif,
		Nodes:        nodes,
		ThreatModel:  trust.SoftwareChainThreatModel,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleVerifyAuditChain explicitly verifies the audit chain integrity and returns broken link locations if tampered.
func (h *TrustHandler) HandleVerifyAuditChain(w http.ResponseWriter, r *http.Request) {
	verif := h.chain.VerifyChain()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(verif)
}

// TrustScoresResponse wraps list of agent trust scores and formula documentation.
type TrustScoresResponse struct {
	TotalEvaluated int                      `json:"total_evaluated"`
	Scores         []*trust.AgentTrustScore `json:"scores"`
	ScoringFormula string                   `json:"scoring_formula"`
	ThreatModel    string                   `json:"threat_model"`
}

// HandleGetTrustScores calculates verifiable trust scores for known and active agents.
func (h *TrustHandler) HandleGetTrustScores(w http.ResponseWriter, r *http.Request) {
	nodes := h.chain.GetNodes()
	seenAgents := make(map[string]bool)

	for _, n := range nodes {
		if n.ActorID != "" {
			seenAgents[n.ActorID] = true
		}
	}

	// Always include standard benchmark agents to display tiers
	seenAgents["research-agent"] = true
	seenAgents["redteam-attacker"] = true
	seenAgents["new-untested-agent"] = true

	scores := make([]*trust.AgentTrustScore, 0, len(seenAgents))
	for agentID := range seenAgents {
		score := h.engine.CalculateTrustScore(agentID)
		scores = append(scores, score)
	}

	resp := TrustScoresResponse{
		TotalEvaluated: len(scores),
		Scores:         scores,
		ScoringFormula: trust.ScoringFormulaDoc,
		ThreatModel:    "Trust is derived strictly from recorded and verifiable events in the audit chain. Synthetic reputation is prevented; unseen agents default to neutral UNKNOWN with 5000 bps baseline.",
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleGetAgentTrustScore calculates the trust score for a single requested agent.
func (h *TrustHandler) HandleGetAgentTrustScore(w http.ResponseWriter, r *http.Request) {
	agentID := r.PathValue("id")
	if agentID == "" {
		http.Error(w, `{"error":"missing agent id"}`, http.StatusBadRequest)
		return
	}

	score := h.engine.CalculateTrustScore(agentID)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(score)
}
