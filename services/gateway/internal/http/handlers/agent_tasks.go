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

// AgentTasksHandler handles POST /v1/agents/tasks.
type AgentTasksHandler struct {
	agentService *agent.Service
}

// NewAgentTasksHandler creates a new AgentTasksHandler.
func NewAgentTasksHandler(agentService *agent.Service) *AgentTasksHandler {
	return &AgentTasksHandler{
		agentService: agentService,
	}
}

// ServeHTTP processes incoming agent tasks.
func (h *AgentTasksHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Only POST method is supported", "")
		return
	}

	start := time.Now()
	ctxReqID := middleware.GetRequestID(r.Context())
	w.Header().Set("X-Request-ID", ctxReqID)

	var req agent.AgentTask
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

	resp, err := h.agentService.ProcessTask(r.Context(), req)
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
