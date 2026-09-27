package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/demo"
)

// DemoMissionHandler handles HTTP endpoints for the flagship deterministic mission replay.
type DemoMissionHandler struct {
	engine *demo.MissionReplayEngine
}

// NewDemoMissionHandler creates a new DemoMissionHandler with a fresh engine.
func NewDemoMissionHandler(engine *demo.MissionReplayEngine) *DemoMissionHandler {
	if engine == nil {
		engine = demo.NewMissionReplayEngine()
	}
	return &DemoMissionHandler{engine: engine}
}

// HandleGetMission handles GET /api/demo/mission
func (h *DemoMissionHandler) HandleGetMission(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(h.engine.GetSummary())
}

// HandleReset handles POST /api/demo/mission/reset
func (h *DemoMissionHandler) HandleReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	summary := h.engine.Reset()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// HandleStart handles POST /api/demo/mission/start
func (h *DemoMissionHandler) HandleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	summary := h.engine.Start()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// HandlePause handles POST /api/demo/mission/pause
func (h *DemoMissionHandler) HandlePause(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	summary := h.engine.Pause()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// HandleStep handles POST /api/demo/mission/step
func (h *DemoMissionHandler) HandleStep(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	summary := h.engine.Step()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// HandleGetEvents handles GET /api/demo/mission/events
func (h *DemoMissionHandler) HandleGetEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	events := h.engine.GetEvents()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"mission_id": demo.CanonicalMissionID,
		"seed":       demo.CanonicalSeed,
		"events":     events,
		"count":      len(events),
	})
}

// HandleGetTrace handles GET /api/demo/mission/trace
func (h *DemoMissionHandler) HandleGetTrace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	trace := h.engine.GetTrace()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"mission_id":     demo.CanonicalMissionID,
		"economic_trace": trace,
		"checksum":       h.engine.ComputeDeterministicChecksum(),
	})
}

// HandleExport handles GET /api/demo/mission/export
func (h *DemoMissionHandler) HandleExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	exported, err := h.engine.ExportJSON()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=\"agentpay_flagship_mission_trace.json\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(exported))
}
