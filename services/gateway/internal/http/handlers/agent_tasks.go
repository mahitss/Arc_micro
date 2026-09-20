package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/agent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

// AgentTaskRequest encapsulates parameters for submitting an agent task.
type AgentTaskRequest struct {
	AgentID           string `json:"agent_id"`
	Task              string `json:"task"`
	VaultAddress      string `json:"vault_address,omitempty"`
	Autonomous        bool   `json:"autonomous,omitempty"`
	WaitForApproval   bool   `json:"wait_for_approval,omitempty"`
	ApprovalTimeoutMs int64  `json:"approval_timeout_ms,omitempty"`
}

// AgentTasksHandler handles agent task submission and state inspection.
type AgentTasksHandler struct {
	agentService *agent.Service
}

// NewAgentTasksHandler creates a new AgentTasksHandler.
func NewAgentTasksHandler(agentService *agent.Service) *AgentTasksHandler {
	return &AgentTasksHandler{
		agentService: agentService,
	}
}

// ServeHTTP processes incoming agent tasks (POST /v1/agents/tasks).
func (h *AgentTasksHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST method is supported", "")
		return
	}

	start := time.Now()
	ctxReqID := middleware.GetRequestID(r.Context())
	w.Header().Set("X-Request-ID", ctxReqID)

	var req AgentTaskRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			writeError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "Request payload exceeds maximum allowed size", ctxReqID)
			return
		}
		writeError(w, http.StatusBadRequest, "MALFORMED_JSON", "Request body contains malformed JSON", ctxReqID)
		return
	}

	task := agent.AgentTask{
		AgentID:      req.AgentID,
		Task:         req.Task,
		VaultAddress: req.VaultAddress,
	}

	if req.Autonomous {
		opts := agent.RunOptions{
			WaitForApproval: req.WaitForApproval,
		}
		if req.ApprovalTimeoutMs > 0 {
			opts.ApprovalTimeout = time.Duration(req.ApprovalTimeoutMs) * time.Millisecond
		}
		res, err := h.agentService.RunAutonomousTask(r.Context(), task, opts)
		duration := time.Since(start)

		if err != nil && res == nil {
			log.Printf("[AUTONOMOUS_AGENT] req_id=%s agent_id=%s error=%v duration_ms=%d",
				ctxReqID, req.AgentID, err, duration.Milliseconds())
			writeError(w, http.StatusBadRequest, "AGENT_EXECUTION_FAILED", err.Error(), ctxReqID)
			return
		}

		log.Printf("[AUTONOMOUS_AGENT] req_id=%s agent_id=%s task_id=%s state=%s duration_ms=%d",
			ctxReqID, req.AgentID, res.TaskID, res.State, duration.Milliseconds())

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(res)
		return
	}

	resp, err := h.agentService.ProcessTask(r.Context(), task)
	duration := time.Since(start)

	if err != nil {
		log.Printf("[AGENT_TASK] req_id=%s agent_id=%s error=%v duration_ms=%d",
			ctxReqID, req.AgentID, err, duration.Milliseconds())

		code := "AGENT_TASK_FAILED"
		status := http.StatusBadRequest
		if errors.Is(err, agent.ErrTaskTooLong) {
			status = http.StatusRequestEntityTooLarge
			code = "TASK_TOO_LONG"
		} else if errors.Is(err, agent.ErrModelExecutionFailed) {
			status = http.StatusBadGateway
			code = "AI_MODEL_FAILED"
		} else if errors.Is(err, agent.ErrMalformedModelOutput) {
			status = http.StatusUnprocessableEntity
			code = "AI_OUTPUT_MALFORMED"
		}
		writeError(w, status, code, err.Error(), ctxReqID)
		return
	}

	log.Printf("[AGENT_TASK] req_id=%s agent_id=%s task_id=%s status=%s duration_ms=%d",
		ctxReqID, req.AgentID, resp.TaskID, resp.Status, duration.Milliseconds())

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleGetTask handles GET /v1/agents/tasks/{id}.
func (h *AgentTasksHandler) HandleGetTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only GET method is supported", "")
		return
	}

	ctxReqID := middleware.GetRequestID(r.Context())
	w.Header().Set("X-Request-ID", ctxReqID)

	taskID := r.PathValue("id")
	if taskID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_TASK_ID", "Task ID is required", ctxReqID)
		return
	}

	res, err := h.agentService.GetTask(taskID)
	if err != nil {
		writeError(w, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found", ctxReqID)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(res)
}
