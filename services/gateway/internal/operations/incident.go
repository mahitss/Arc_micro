package operations

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

var (
	ErrForbiddenMitigation = errors.New("forbidden mitigation: cannot alter financial rules, approve payments, or bypass security")
	ErrIncidentNotFound    = errors.New("incident not found")
)

// IncidentCorrelationEngine groups related failures into unified operational incidents.
type IncidentCorrelationEngine struct {
	mu           sync.RWMutex
	incidents    map[string]*OperationsIncident // keyed by incident_id
	correlations map[string]string              // correlation_id -> incident_id
}

// NewIncidentCorrelationEngine creates an instance of IncidentCorrelationEngine.
func NewIncidentCorrelationEngine() *IncidentCorrelationEngine {
	return &IncidentCorrelationEngine{
		incidents:    make(map[string]*OperationsIncident),
		correlations: make(map[string]string),
	}
}

// RecordFailure groups or spawns an operational incident based on correlation ID or category.
func (ice *IncidentCorrelationEngine) RecordFailure(
	tenantID string,
	category string,
	severity IncidentSeverity,
	rootCause string,
	workflowID string,
	resourceID string,
	correlationID string,
) *OperationsIncident {
	ice.mu.Lock()
	defer ice.mu.Unlock()

	now := time.Now().UTC()

	// Check if existing incident matches correlationID
	if correlationID != "" {
		if incID, exists := ice.correlations[correlationID]; exists {
			inc := ice.incidents[incID]
			if workflowID != "" && !containsString(inc.AffectedWorkflows, workflowID) {
				inc.AffectedWorkflows = append(inc.AffectedWorkflows, workflowID)
			}
			if resourceID != "" && !containsString(inc.AffectedResources, resourceID) {
				inc.AffectedResources = append(inc.AffectedResources, resourceID)
			}
			return inc
		}
	}

	// Create new incident
	incidentID := "inc_" + uuid.NewString()[:8]
	if correlationID == "" {
		correlationID = fmt.Sprintf("corr_%s_%d", category, now.Unix())
	}

	inc := &OperationsIncident{
		IncidentID:        incidentID,
		TenantID:          tenantID,
		Severity:          severity,
		Category:          category,
		State:             IncidentStateDetected,
		RootCause:         rootCause,
		AffectedWorkflows: []string{},
		AffectedResources: []string{},
		MitigationActions: []string{},
		CorrelationID:     correlationID,
		DetectedAt:        now,
	}

	if workflowID != "" {
		inc.AffectedWorkflows = append(inc.AffectedWorkflows, workflowID)
	}
	if resourceID != "" {
		inc.AffectedResources = append(inc.AffectedResources, resourceID)
	}

	ice.incidents[incidentID] = inc
	ice.correlations[correlationID] = incidentID

	return inc
}

// ApplyMitigation validates and executes a safe automatic operational mitigation.
// Enforces INV-123, INV-124, INV-125, and INV-132:
// Forbidden: Increase spending, bypass policy, approve payment, change recipient.
func (ice *IncidentCorrelationEngine) ApplyMitigation(tenantID, incidentID, action string) error {
	ice.mu.Lock()
	defer ice.mu.Unlock()

	inc, exists := ice.incidents[incidentID]
	if !exists || inc.TenantID != tenantID {
		return ErrIncidentNotFound
	}

	// Check against forbidden financial bypass actions
	actionUpper := strings.ToUpper(action)
	forbiddenWords := []string{
		"INCREASE_LIMIT", "BYPASS_POLICY", "APPROVE_PAYMENT", "FORCE_PAY",
		"MUTATE_RECIPIENT", "DISABLE_SECURITY", "OVERRIDE_DENY", "BYPASS_APPROVAL",
	}
	for _, word := range forbiddenWords {
		if strings.Contains(actionUpper, word) {
			return fmt.Errorf("%w: action %s is strictly prohibited", ErrForbiddenMitigation, action)
		}
	}

	// Permitted safe mitigations:
	// RESTART_WORKER, RECLAIM_LEASE, PAUSE_WORKFLOW, REDUCE_CONCURRENCY,
	// STOP_FAILING_PROVIDER, TRIGGER_RECONCILIATION, REBUILD_READ_MODEL, DRAIN_WORKER
	inc.MitigationActions = append(inc.MitigationActions, action)
	inc.State = IncidentStateMitigating

	return nil
}

// TransitionState advances an incident through its lifecycle.
func (ice *IncidentCorrelationEngine) TransitionState(tenantID, incidentID string, targetState IncidentState) error {
	ice.mu.Lock()
	defer ice.mu.Unlock()

	inc, exists := ice.incidents[incidentID]
	if !exists || inc.TenantID != tenantID {
		return ErrIncidentNotFound
	}

	now := time.Now().UTC()
	inc.State = targetState

	switch targetState {
	case IncidentStateTriaged:
		inc.TriagedAt = &now
	case IncidentStateResolved:
		inc.ResolvedAt = &now
	case IncidentStateClosed:
		inc.ClosedAt = &now
	}

	return nil
}

// ListIncidents returns all incidents for a tenant.
func (ice *IncidentCorrelationEngine) ListIncidents(tenantID string) []*OperationsIncident {
	ice.mu.RLock()
	defer ice.mu.RUnlock()

	var list []*OperationsIncident
	for _, inc := range ice.incidents {
		if inc.TenantID == tenantID {
			list = append(list, inc)
		}
	}
	return list
}

func containsString(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}
