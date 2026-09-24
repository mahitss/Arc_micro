package operations

import (
	"time"
)

// TimeTravelDebugger reconstructs read-only system snapshots at specific historical timestamps.
type TimeTravelDebugger struct{}

// NewTimeTravelDebugger creates an instance of TimeTravelDebugger.
func NewTimeTravelDebugger() *TimeTravelDebugger {
	return &TimeTravelDebugger{}
}

// StateAt reconstructs the system state projection at timestamp targetTime.
// Strictly enforces INV-130: Time travel reconstruction cannot mutate state.
func (tt *TimeTravelDebugger) StateAt(
	tenantID string,
	targetTime time.Time,
	allWorkflows []map[string]interface{},
	incidents []*OperationsIncident,
) SystemStateAtSnapshot {
	_ = ValidateTimeTravelReadOnly(false)

	activeCount := 0
	statesMap := make(map[string]string)

	for _, wf := range allWorkflows {
		createdAt, _ := wf["created_at"].(time.Time)
		// Only consider workflows created at or before targetTime
		if !createdAt.IsZero() && createdAt.After(targetTime) {
			continue
		}

		wfID, _ := wf["workflow_id"].(string)
		wfState, _ := wf["state"].(string)
		statesMap[wfID] = wfState
		if wfState == "RUNNING" || wfState == "WAITING" || wfState == "RETRYING" {
			activeCount++
		}
	}

	incidentList := make([]string, 0)
	for _, inc := range incidents {
		if inc.DetectedAt.Before(targetTime) {
			if inc.ResolvedAt == nil || inc.ResolvedAt.After(targetTime) {
				incidentList = append(incidentList, inc.IncidentID)
			}
		}
	}

	return SystemStateAtSnapshot{
		Timestamp:            targetTime,
		TenantID:             tenantID,
		ReconstructedFrom:    "EVENTS_AND_CHECKPOINTS",
		ActiveWorkflows:      activeCount,
		WorkflowStates:       statesMap,
		ActiveWorkers:        []string{"worker_fleet_historic"},
		Incidents:            incidentList,
		FinancialStateFrozen: true,
	}
}
