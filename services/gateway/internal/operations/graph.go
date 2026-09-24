package operations

import (
	"sync"
	"time"
)

// OperationalGraphBuilder constructs read-only topology graphs of active operational relationships.
type OperationalGraphBuilder struct {
	mu sync.RWMutex
}

// NewOperationalGraphBuilder creates an instance of OperationalGraphBuilder.
func NewOperationalGraphBuilder() *OperationalGraphBuilder {
	return &OperationalGraphBuilder{}
}

// BuildGraph synthesizes an OperationalGraph from provided workflows, steps, workers, and incidents.
// This graph is strictly read-only and cannot create financial authority (INV-129).
func (gb *OperationalGraphBuilder) BuildGraph(
	tenantID string,
	workflows []map[string]interface{},
	workers []map[string]interface{},
	incidents []*OperationsIncident,
) OperationalGraph {
	gb.mu.RLock()
	defer gb.mu.RUnlock()

	now := time.Now().UTC()
	nodes := make([]OperationalGraphNode, 0)
	edges := make([]OperationalGraphEdge, 0)

	// 1. Process Workers
	for _, w := range workers {
		wID, _ := w["worker_id"].(string)
		wState, _ := w["status"].(string)
		nodes = append(nodes, OperationalGraphNode{
			ID:         wID,
			Type:       "WORKER",
			Label:      "Worker " + wID,
			State:      wState,
			AgeSeconds: 0,
			Metadata:   w,
		})
	}

	// 2. Process Workflows & Associated Domain Nodes
	for _, wf := range workflows {
		wfID, _ := wf["workflow_id"].(string)
		wfType, _ := wf["workflow_type"].(string)
		wfState, _ := wf["state"].(string)

		nodes = append(nodes, OperationalGraphNode{
			ID:         wfID,
			Type:       "WORKFLOW",
			Label:      wfType + " (" + wfID + ")",
			State:      wfState,
			AgeSeconds: 0,
			Metadata:   wf,
		})

		// Add Policy Node
		policyID := "pol_" + wfID
		nodes = append(nodes, OperationalGraphNode{
			ID:    policyID,
			Type:  "POLICY",
			Label: "Policy Guard",
			State: "ACTIVE",
		})
		edges = append(edges, OperationalGraphEdge{
			Source:   wfID,
			Target:   policyID,
			Relation: "GOVERNED_BY",
		})

		// Add Treasury Node
		treasuryID := "tres_" + wfID
		nodes = append(nodes, OperationalGraphNode{
			ID:    treasuryID,
			Type:  "TREASURY_RESERVATION",
			Label: "Treasury Budget",
			State: "RESERVED",
		})
		edges = append(edges, OperationalGraphEdge{
			Source:   wfID,
			Target:   treasuryID,
			Relation: "RESERVED_FROM",
		})

		// Add Settlement / Arc Node
		arcNodeID := "arc_" + wfID
		nodes = append(nodes, OperationalGraphNode{
			ID:    arcNodeID,
			Type:  "PAYMENT",
			Label: "Arc Settlement",
			State: "VERIFIED",
		})
		edges = append(edges, OperationalGraphEdge{
			Source:   treasuryID,
			Target:   arcNodeID,
			Relation: "PAYS",
		})
	}

	// 3. Process Incidents
	for _, inc := range incidents {
		nodes = append(nodes, OperationalGraphNode{
			ID:       inc.IncidentID,
			Type:     "INCIDENT",
			Label:    inc.Category,
			State:    string(inc.State),
			Metadata: map[string]interface{}{"severity": inc.Severity, "root_cause": inc.RootCause},
		})
		for _, affWf := range inc.AffectedWorkflows {
			edges = append(edges, OperationalGraphEdge{
				Source:   inc.IncidentID,
				Target:   affWf,
				Relation: "TRIGGERED",
			})
		}
	}

	return OperationalGraph{
		Nodes:       nodes,
		Edges:       edges,
		GeneratedAt: now,
	}
}
