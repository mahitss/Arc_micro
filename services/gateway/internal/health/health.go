package health

import (
	"encoding/json"
	"net/http"
)

// Response represents the health check response payload.
type Response struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

// Handler handles GET /health requests.
func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	resp := Response{
		Status:  "ok",
		Service: "gateway",
	}

	_ = json.NewEncoder(w).Encode(resp)
}
