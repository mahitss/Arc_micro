package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/constitution"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

// ConstitutionHandler handles HTTP REST endpoints for the Economic Constitution.
type ConstitutionHandler struct {
	store      constitution.Store
	gov        *constitution.GovernanceService
	evaluator  constitution.Evaluator
	diffEngine *constitution.PolicyDiffEngine
	testRunner *constitution.TestRunner
}

// NewConstitutionHandler creates a new ConstitutionHandler.
func NewConstitutionHandler(store constitution.Store) *ConstitutionHandler {
	eval := constitution.NewEvaluator()
	return &ConstitutionHandler{
		store:      store,
		gov:        constitution.NewGovernanceService(store),
		evaluator:  eval,
		diffEngine: constitution.NewPolicyDiffEngine(),
		testRunner: constitution.NewTestRunner(eval),
	}
}

// HandleGetActive handles GET /v1/constitutions/active
func (h *ConstitutionHandler) HandleGetActive(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	active, err := h.store.GetActiveConstitution(r.Context(), orgID)
	if err != nil {
		// Initialize DefaultConstitution on demand if none exists
		genesis := constitution.DefaultConstitution(orgID)
		_ = h.store.SaveConstitution(r.Context(), &genesis)
		active = &genesis
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"constitution": active,
		"request_id":   ctxReqID,
	})
}

// HandleList handles GET /v1/constitutions
func (h *ConstitutionHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	list, err := h.store.ListConstitutions(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "LIST_FAILED", err.Error(), ctxReqID)
		return
	}
	if len(list) == 0 {
		genesis := constitution.DefaultConstitution(orgID)
		_ = h.store.SaveConstitution(r.Context(), &genesis)
		list = []constitution.EconomicConstitution{genesis}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"constitutions": list,
		"count":         len(list),
		"request_id":    ctxReqID,
	})
}

// HandleGetByVersion handles GET /v1/constitutions/{version}
func (h *ConstitutionHandler) HandleGetByVersion(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	verStr := r.PathValue("version")
	ver, err := strconv.ParseUint(verStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_VERSION", "Version must be a non-negative integer", ctxReqID)
		return
	}

	c, err := h.store.GetConstitutionByVersion(r.Context(), orgID, ver)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"constitution": c,
		"request_id":   ctxReqID,
	})
}

// HandlePropose handles POST /v1/constitutions
func (h *ConstitutionHandler) HandlePropose(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	var payload struct {
		Candidate constitution.EconomicConstitution `json:"candidate"`
		Proposer  string                            `json:"proposer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed JSON body", ctxReqID)
		return
	}

	if payload.Proposer == "" {
		payload.Proposer = "operator_web"
	}

	pcr, err := h.gov.ProposeChange(r.Context(), orgID, payload.Candidate, payload.Proposer)
	if err != nil {
		writeError(w, http.StatusBadRequest, "PROPOSE_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"change_request": pcr,
		"request_id":     ctxReqID,
	})
}

// HandleEvaluate handles POST /v1/constitutions/evaluate
func (h *ConstitutionHandler) HandleEvaluate(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	var ctx constitution.PolicyEvaluationContext
	if err := json.NewDecoder(r.Body).Decode(&ctx); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed evaluation context", ctxReqID)
		return
	}
	if ctx.OrganizationID == "" {
		ctx.OrganizationID = orgID
	}

	active, err := h.store.GetActiveConstitution(r.Context(), ctx.OrganizationID)
	if err != nil {
		genesis := constitution.DefaultConstitution(ctx.OrganizationID)
		_ = h.store.SaveConstitution(r.Context(), &genesis)
		active = &genesis
	}

	decision := h.evaluator.Evaluate(active, ctx)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"decision":   decision,
		"request_id": ctxReqID,
	})
}

// HandleDiff handles POST /v1/constitutions/diff
func (h *ConstitutionHandler) HandleDiff(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	var req struct {
		OldVersion uint64 `json:"old_version"`
		NewVersion uint64 `json:"new_version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed diff request", ctxReqID)
		return
	}

	oldC, err := h.store.GetConstitutionByVersion(r.Context(), orgID, req.OldVersion)
	if err != nil {
		writeError(w, http.StatusNotFound, "OLD_NOT_FOUND", "Old version not found", ctxReqID)
		return
	}

	newC, err := h.store.GetConstitutionByVersion(r.Context(), orgID, req.NewVersion)
	if err != nil {
		writeError(w, http.StatusNotFound, "NEW_NOT_FOUND", "New version not found", ctxReqID)
		return
	}

	diff := h.diffEngine.Diff(oldC, newC)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"diff":       diff,
		"request_id": ctxReqID,
	})
}

// HandleTest handles POST /v1/constitutions/test
func (h *ConstitutionHandler) HandleTest(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	var req struct {
		Version   uint64                        `json:"version"`
		TestCases []constitution.PolicyTestCase `json:"test_cases"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed test payload", ctxReqID)
		return
	}

	c, err := h.store.GetConstitutionByVersion(r.Context(), orgID, req.Version)
	if err != nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Constitution version not found", ctxReqID)
		return
	}

	report := h.testRunner.RunTestSuite(c, req.TestCases)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"report":     report,
		"request_id": ctxReqID,
	})
}

// HandleActivate handles POST /v1/constitutions/activate
func (h *ConstitutionHandler) HandleActivate(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	var req struct {
		ChangeRequestID string `json:"change_request_id"`
		Approver        string `json:"approver"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed activate payload", ctxReqID)
		return
	}
	if req.Approver == "" {
		req.Approver = "security_lead"
	}

	activated, err := h.gov.ActivateChange(r.Context(), req.ChangeRequestID, req.Approver, nil)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ACTIVATION_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "ACTIVATED",
		"constitution": activated,
		"request_id":   ctxReqID,
	})
}

// HandleRollback handles POST /v1/constitutions/rollback
func (h *ConstitutionHandler) HandleRollback(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	var req struct {
		TargetVersion uint64 `json:"target_version"`
		Actor         string `json:"actor"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed rollback payload", ctxReqID)
		return
	}
	if req.Actor == "" {
		req.Actor = "security_admin"
	}

	rolledBack, err := h.gov.RollbackPolicy(r.Context(), orgID, req.TargetVersion, req.Actor)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ROLLBACK_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "ROLLED_BACK",
		"constitution": rolledBack,
		"request_id":   ctxReqID,
	})
}

// HandleListChanges handles GET /v1/constitutions/changes
func (h *ConstitutionHandler) HandleListChanges(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		orgID = "org_default"
	}

	list, err := h.store.ListChangeRequests(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "LIST_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"change_requests": list,
		"count":           len(list),
		"request_id":      ctxReqID,
	})
}

// HandleReviewChange handles POST /v1/constitutions/changes/{id}/review
func (h *ConstitutionHandler) HandleReviewChange(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	reqID := r.PathValue("id")

	var req struct {
		Reviewer string `json:"reviewer"`
		Approve  bool   `json:"approve"`
		Notes    string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Malformed review payload", ctxReqID)
		return
	}
	if req.Reviewer == "" {
		req.Reviewer = "governance_reviewer"
	}

	cr, err := h.gov.ReviewChange(r.Context(), reqID, req.Reviewer, req.Approve, req.Notes)
	if err != nil {
		writeError(w, http.StatusBadRequest, "REVIEW_FAILED", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"change_request": cr,
		"request_id":     ctxReqID,
	})
}
