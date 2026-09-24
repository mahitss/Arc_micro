package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/clearinghouse"
)

// ClearinghouseHandler serves the HTTP API for the Autonomous Economic Clearinghouse.
type ClearinghouseHandler struct {
	service clearinghouse.Service
}

func NewClearinghouseHandler(svc clearinghouse.Service) *ClearinghouseHandler {
	return &ClearinghouseHandler{
		service: svc,
	}
}

// -----------------------------------------------------------------------------
// OBLIGATIONS
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleCreateObligation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req clearinghouse.EconomicObligation
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	ob, err := h.service.CreateObligation(r.Context(), &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(ob)
}

func (h *ClearinghouseHandler) HandleListObligations(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	obs, err := h.service.ListObligations(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(obs)
}

func (h *ClearinghouseHandler) HandleGetObligation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		parts := strings.Split(r.URL.Path, "/")
		id = parts[len(parts)-1]
	}
	ob, err := h.service.GetObligation(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(ob)
}

func (h *ClearinghouseHandler) HandleCancelObligation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := h.service.CancelObligation(r.Context(), id, body.Reason); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "CANCELLED"})
}

// -----------------------------------------------------------------------------
// INVOICES
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleCreateInvoice(w http.ResponseWriter, r *http.Request) {
	var inv clearinghouse.EconomicInvoice
	if err := json.NewDecoder(r.Body).Decode(&inv); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.service.CreateInvoice(r.Context(), &inv)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(created)
}

func (h *ClearinghouseHandler) HandleListInvoices(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	invs, err := h.service.ListInvoices(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(invs)
}

func (h *ClearinghouseHandler) HandleGetInvoice(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	inv, err := h.service.GetInvoice(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(inv)
}

func (h *ClearinghouseHandler) HandleAcceptInvoice(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.service.AcceptInvoice(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ACCEPTED"})
}

func (h *ClearinghouseHandler) HandleDisputeInvoice(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := h.service.DisputeInvoice(r.Context(), id, body.Reason); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "DISPUTED"})
}

// -----------------------------------------------------------------------------
// ESCROWS
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleCreateEscrow(w http.ResponseWriter, r *http.Request) {
	var esc clearinghouse.EconomicEscrow
	if err := json.NewDecoder(r.Body).Decode(&esc); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.service.CreateEscrow(r.Context(), &esc)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(created)
}

func (h *ClearinghouseHandler) HandleListEscrows(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	list, err := h.service.ListEscrows(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClearinghouseHandler) HandleGetEscrow(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	esc, err := h.service.GetEscrow(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(esc)
}

func (h *ClearinghouseHandler) HandleReleaseEscrow(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Amount string `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.service.ReleaseEscrow(r.Context(), id, body.Amount); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "RELEASED"})
}

func (h *ClearinghouseHandler) HandleRefundEscrow(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := h.service.RefundEscrow(r.Context(), id, body.Reason); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "REFUNDED"})
}

// -----------------------------------------------------------------------------
// MILESTONES
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleCreateMilestone(w http.ResponseWriter, r *http.Request) {
	var ms clearinghouse.PaymentMilestone
	if err := json.NewDecoder(r.Body).Decode(&ms); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.service.CreateMilestone(r.Context(), &ms)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(created)
}

func (h *ClearinghouseHandler) HandleListMilestones(w http.ResponseWriter, r *http.Request) {
	contractID := r.URL.Query().Get("contract_id")
	list, err := h.service.ListMilestones(r.Context(), contractID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClearinghouseHandler) HandleSubmitMilestone(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		ActualOutput string `json:"actual_output"`
		ResultHash   string `json:"result_hash"`
		EvidenceURI  string `json:"evidence_uri"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.service.SubmitMilestone(r.Context(), id, body.ActualOutput, body.ResultHash, body.EvidenceURI); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "SUBMITTED"})
}

func (h *ClearinghouseHandler) HandleVerifyMilestone(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	res, err := h.service.VerifyMilestone(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

func (h *ClearinghouseHandler) HandleSettleMilestone(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		IdempotencyKey string `json:"idempotency_key"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.IdempotencyKey == "" {
		body.IdempotencyKey = r.Header.Get("Idempotency-Key")
	}
	pi, err := h.service.SettleMilestone(r.Context(), id, body.IdempotencyKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(pi)
}

// -----------------------------------------------------------------------------
// NETTING
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleProposeNetting(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrganizationID string `json:"organization_id"`
		AgentA         string `json:"agent_a"`
		AgentB         string `json:"agent_b"`
		Currency       string `json:"currency"`
		TTLSeconds     int    `json:"ttl_seconds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	ttl := time.Duration(body.TTLSeconds) * time.Second
	prop, err := h.service.ProposeNetting(r.Context(), body.OrganizationID, body.AgentA, body.AgentB, body.Currency, ttl)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(prop)
}

func (h *ClearinghouseHandler) HandleListNetting(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	list, err := h.service.ListNettingProposals(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClearinghouseHandler) HandleApproveNetting(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		AgentID string `json:"agent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	prop, err := h.service.ApproveNetting(r.Context(), id, body.AgentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(prop)
}

func (h *ClearinghouseHandler) HandleExecuteNetting(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		IdempotencyKey string `json:"idempotency_key"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	pi, err := h.service.ExecuteNetting(r.Context(), id, body.IdempotencyKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(pi)
}

// -----------------------------------------------------------------------------
// SETTLEMENT BATCHES
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleCreateBatch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		OrganizationID string                      `json:"organization_id"`
		Currency       string                      `json:"currency"`
		ObligationIDs  []string                    `json:"obligation_ids"`
		ExecutionMode  clearinghouse.ExecutionMode `json:"execution_mode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	batch, err := h.service.CreateBatch(r.Context(), body.OrganizationID, body.Currency, body.ObligationIDs, body.ExecutionMode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(batch)
}

func (h *ClearinghouseHandler) HandleListBatches(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	list, err := h.service.ListBatches(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClearinghouseHandler) HandleGetBatch(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	batch, err := h.service.GetBatch(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(batch)
}

func (h *ClearinghouseHandler) HandleExecuteBatch(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	intents, err := h.service.ExecuteBatch(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(intents)
}

// -----------------------------------------------------------------------------
// REFUNDS
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleRequestRefund(w http.ResponseWriter, r *http.Request) {
	var ref clearinghouse.RefundRequest
	if err := json.NewDecoder(r.Body).Decode(&ref); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	created, err := h.service.RequestRefund(r.Context(), &ref)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(created)
}

func (h *ClearinghouseHandler) HandleListRefunds(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	list, err := h.service.ListRefunds(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClearinghouseHandler) HandleApproveRefund(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.service.ApproveRefund(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "APPROVED"})
}

func (h *ClearinghouseHandler) HandleExecuteRefund(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		IdempotencyKey string `json:"idempotency_key"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	pi, err := h.service.ExecuteRefund(r.Context(), id, body.IdempotencyKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(pi)
}

// -----------------------------------------------------------------------------
// RECONCILIATION
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleListReconciliation(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	list, err := h.service.ListReconciliationRecords(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClearinghouseHandler) HandleReconcileObligation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	rec, err := h.service.ReconcileObligation(r.Context(), id)
	if err != nil {
		// Return record with discrepancy notes even if mismatch/ambiguous
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(rec)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(rec)
}

// -----------------------------------------------------------------------------
// EXPOSURE & HEALTH
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleGetExposure(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	mode := clearinghouse.ModeReal
	if strings.EqualFold(r.URL.Query().Get("mode"), "SIMULATION") {
		mode = clearinghouse.ModeSimulation
	}
	exp, err := h.service.GetExposure(r.Context(), orgID, mode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(exp)
}

func (h *ClearinghouseHandler) HandleGetHealth(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	if orgID == "" {
		orgID = "org_default"
	}
	bal := r.URL.Query().Get("balance")
	if bal == "" {
		bal = "100000000" // 100 USDC default
	}
	mode := clearinghouse.ModeReal
	if strings.EqualFold(r.URL.Query().Get("mode"), "SIMULATION") {
		mode = clearinghouse.ModeSimulation
	}
	health, err := h.service.GetHealth(r.Context(), orgID, bal, mode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(health)
}

// -----------------------------------------------------------------------------
// CLEARINGHOUSE LEDGER
// -----------------------------------------------------------------------------

func (h *ClearinghouseHandler) HandleGetLedger(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	entries, err := h.service.GetLedgerEntries(r.Context(), orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(entries)
}
