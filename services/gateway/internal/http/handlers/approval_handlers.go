package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/service"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

type ApprovalActionRequest struct {
	ApproverID string `json:"approver_id"`
	Reason     string `json:"reason,omitempty"`
}

type ApprovalsHandler struct {
	repo          storage.Repository
	domainService service.DomainService
}

func NewApprovalsHandler(repo storage.Repository, ds service.DomainService) *ApprovalsHandler {
	return &ApprovalsHandler{
		repo:          repo,
		domainService: ds,
	}
}

// HandleList handles GET /v1/approvals
func (h *ApprovalsHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	orgID := r.URL.Query().Get("organization_id")
	authOrgID := middleware.GetOrgID(r.Context())
	if authOrgID != "" {
		orgID = authOrgID
	}

	apps, err := h.repo.ListApprovals(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"approvals": apps,
		"count":     len(apps),
	})
}

// HandleGet handles GET /v1/approvals/{id}
func (h *ApprovalsHandler) HandleGet(w http.ResponseWriter, r *http.Request) {
	ctxReqID := middleware.GetRequestID(r.Context())
	authOrgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "approval id is required", ctxReqID)
		return
	}

	app, err := h.repo.GetApproval(r.Context(), id)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "approval not found", ctxReqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	// Tenant isolation: prevent IDOR across organizations
	if app.OrganizationID != "" && authOrgID != "" && app.OrganizationID != authOrgID {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "approval not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(app)
}

// HandleApprove handles POST /v1/approvals/{id}/approve
func (h *ApprovalsHandler) HandleApprove(w http.ResponseWriter, r *http.Request) {
	h.resolveApproval(w, r, true)
}

// HandleReject handles POST /v1/approvals/{id}/reject
func (h *ApprovalsHandler) HandleReject(w http.ResponseWriter, r *http.Request) {
	h.resolveApproval(w, r, false)
}

func (h *ApprovalsHandler) resolveApproval(w http.ResponseWriter, r *http.Request, approve bool) {
	ctxReqID := middleware.GetRequestID(r.Context())
	authOrgID := middleware.GetOrgID(r.Context())
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "approval id is required", ctxReqID)
		return
	}

	app, err := h.repo.GetApproval(r.Context(), id)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "approval not found", ctxReqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	// Tenant isolation: prevent cross-organization approval manipulation
	if app.OrganizationID != "" && authOrgID != "" && app.OrganizationID != authOrgID {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "approval not found", ctxReqID)
		return
	}

	var req ApprovalActionRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_REQUEST_BODY", "failed to parse request JSON", ctxReqID)
			return
		}
	}

	approverID := strings.TrimSpace(req.ApproverID)
	if approverID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_APPROVER_ID", "approver_id is required", ctxReqID)
		return
	}

	pi, updatedApp, err := h.domainService.RecordApproval(
		r.Context(),
		app.OrganizationID,
		app.PaymentIntentID,
		approverID,
		approve,
		req.Reason,
	)
	if err != nil {
		if errors.Is(err, service.ErrCannotApproveDenied) {
			writeError(w, http.StatusForbidden, "HARD_DENIAL_INVIOLABLE", "policy DENY cannot be overridden by human approval", ctxReqID)
			return
		}
		if errors.Is(err, service.ErrAgentSelfApprovalProhibited) {
			writeError(w, http.StatusForbidden, "SELF_APPROVAL_PROHIBITED", "agent cannot approve its own payment intent", ctxReqID)
			return
		}
		if errors.Is(err, service.ErrIntentExpired) || errors.Is(err, service.ErrApprovalExpired) {
			writeError(w, http.StatusGone, "APPROVAL_EXPIRED", "approval or intent has expired", ctxReqID)
			return
		}
		if errors.Is(err, service.ErrApprovalConflict) {
			writeError(w, http.StatusConflict, "CONCURRENT_MODIFICATION", "approval state was concurrently modified", ctxReqID)
			return
		}
		if errors.Is(err, service.ErrIntentNotPendingAppr) {
			writeError(w, http.StatusBadRequest, "INVALID_STATE", err.Error(), ctxReqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"intent":   pi,
		"approval": updatedApp,
	})
}
