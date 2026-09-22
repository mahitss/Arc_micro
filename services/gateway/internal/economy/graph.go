package economy

import (
	"context"
	"fmt"
)

// GraphBuilder constructs the directed acyclic economic graph for a mission.
type GraphBuilder struct{}

// NewGraphBuilder initializes the graph builder.
func NewGraphBuilder() *GraphBuilder {
	return &GraphBuilder{}
}

// BuildEconomicGraph constructs nodes and edges tracing the complete economic network of a mission.
func (gb *GraphBuilder) BuildEconomicGraph(
	ctx context.Context,
	mission *Mission,
	hires []*Hire,
	steps []MissionStep,
) *EconomicGraph {
	g := &EconomicGraph{
		MissionID: mission.ID,
		Nodes:     make([]GraphNode, 0),
		Edges:     make([]GraphEdge, 0),
	}

	seenNodes := make(map[string]bool)

	addNode := func(node GraphNode) {
		if !seenNodes[node.ID] {
			seenNodes[node.ID] = true
			g.Nodes = append(g.Nodes, node)
		}
	}

	// 1. Mission Root Node
	addNode(GraphNode{
		ID:    mission.ID,
		Type:  NodeTypeMission,
		Label: fmt.Sprintf("Mission: %s", mission.Objective),
		Metadata: map[string]interface{}{
			"budget":   mission.Budget,
			"spent":    mission.Spent,
			"currency": mission.Currency,
			"status":   mission.Status,
		},
	})

	// 2. Ordering Agent Node
	addNode(GraphNode{
		ID:    mission.AgentID,
		Type:  NodeTypeAgent,
		Label: fmt.Sprintf("Buyer Agent: %s", mission.AgentID),
		Metadata: map[string]interface{}{
			"role": "PRIMARY_ORCHESTRATOR",
		},
	})

	// Edge: Mission assigned to Buyer Agent
	g.Edges = append(g.Edges, GraphEdge{
		Source: mission.ID,
		Target: mission.AgentID,
		Type:   EdgeTypeDependsOn,
		Label:  "ASSIGNED_TO",
	})

	// 3. Process Hires
	for _, h := range hires {
		// Seller Agent Node
		addNode(GraphNode{
			ID:    h.SellerAgentID,
			Type:  NodeTypeAgent,
			Label: fmt.Sprintf("Worker Agent: %s", h.SellerAgentID),
			Metadata: map[string]interface{}{
				"capability": h.Capability,
				"service_id": h.ServiceID,
			},
		})

		// Service Node
		addNode(GraphNode{
			ID:    h.ServiceID,
			Type:  NodeTypeService,
			Label: fmt.Sprintf("Service: %s", h.ServiceID),
			Metadata: map[string]interface{}{
				"price": h.Price,
				"asset": h.Asset,
			},
		})

		// Hire Contract Node
		addNode(GraphNode{
			ID:    h.ID,
			Type:  NodeTypeHire,
			Label: fmt.Sprintf("Hire: %s", h.Capability),
			Metadata: map[string]interface{}{
				"price":      h.Price,
				"status":     h.Status,
				"call_depth": h.CallDepth,
			},
		})

		// Edge: Buyer -> Hire
		g.Edges = append(g.Edges, GraphEdge{
			Source: h.BuyerAgentID,
			Target: h.ID,
			Type:   EdgeTypeHired,
			Label:  fmt.Sprintf("HIRED (%s)", h.Price),
		})

		// Edge: Hire -> Seller
		g.Edges = append(g.Edges, GraphEdge{
			Source: h.ID,
			Target: h.SellerAgentID,
			Type:   EdgeTypeDependsOn,
			Label:  "DELEGATED_TO",
		})

		// Edge: Hire -> Service
		g.Edges = append(g.Edges, GraphEdge{
			Source: h.ID,
			Target: h.ServiceID,
			Type:   EdgeTypeDependsOn,
			Label:  "PROVISIONED_BY",
		})

		// 4. Payment Node if settled
		if h.PaymentIntentID != "" {
			addNode(GraphNode{
				ID:    h.PaymentIntentID,
				Type:  NodeTypePayment,
				Label: fmt.Sprintf("Payment: %s %s", h.Price, h.Asset),
				Metadata: map[string]interface{}{
					"intent_id": h.PaymentIntentID,
					"amount":    h.Price,
					"asset":     h.Asset,
					"status":    "CONFIRMED",
				},
			})

			// Edge: Hire -> Payment
			g.Edges = append(g.Edges, GraphEdge{
				Source: h.ID,
				Target: h.PaymentIntentID,
				Type:   EdgeTypePaid,
				Label:  "PAID",
			})
		}

		// 5. Result & Validation edges
		if h.Result != nil {
			resultNodeID := fmt.Sprintf("res_%s", h.ID)
			addNode(GraphNode{
				ID:    resultNodeID,
				Type:  NodeTypeService,
				Label: fmt.Sprintf("Result: %s", h.Capability),
				Metadata: map[string]interface{}{
					"quality":        h.Result.Quality,
					"checksum":       h.Result.ChecksumSHA256,
					"execution_time": h.Result.ExecutionTimeMs,
				},
			})

			g.Edges = append(g.Edges, GraphEdge{
				Source: h.SellerAgentID,
				Target: resultNodeID,
				Type:   EdgeTypeProduced,
				Label:  "PRODUCED",
			})

			// If validator agent was involved
			if h.Capability == "verification" {
				g.Edges = append(g.Edges, GraphEdge{
					Source: h.SellerAgentID,
					Target: mission.AgentID,
					Type:   EdgeTypeValidatedBy,
					Label:  "VALIDATED_FOR",
				})
			}
		}

		// Nested composition edge
		if h.ParentHireID != "" {
			g.Edges = append(g.Edges, GraphEdge{
				Source: h.ParentHireID,
				Target: h.ID,
				Type:   EdgeTypeDependsOn,
				Label:  fmt.Sprintf("NESTED_SUBTASK (depth %d)", h.CallDepth),
			})
		}
	}

	return g
}

// BuildSwarmEconomicGraph constructs a traceable directed acyclic economic graph for a swarm.
func (gb *GraphBuilder) BuildSwarmEconomicGraph(
	ctx context.Context,
	swarm *Swarm,
	tasks []*TaskNode,
	hires []*Hire,
) *EconomicGraph {
	g := &EconomicGraph{
		MissionID: swarm.RootMissionID,
		Nodes:     make([]GraphNode, 0),
		Edges:     make([]GraphEdge, 0),
	}

	seenNodes := make(map[string]bool)
	addNode := func(node GraphNode) {
		if !seenNodes[node.ID] {
			seenNodes[node.ID] = true
			g.Nodes = append(g.Nodes, node)
		}
	}

	// 1. Mission Root Node
	if swarm.RootMissionID != "" {
		addNode(GraphNode{
			ID:    swarm.RootMissionID,
			Type:  NodeTypeMission,
			Label: fmt.Sprintf("Root Mission: %s", swarm.RootMissionID),
			Metadata: map[string]interface{}{
				"organization_id": swarm.OrganizationID,
			},
		})
	}

	// 2. Swarm Node
	addNode(GraphNode{
		ID:    swarm.ID,
		Type:  NodeTypeSwarm,
		Label: fmt.Sprintf("Swarm: %s", swarm.Objective),
		Metadata: map[string]interface{}{
			"budget":    swarm.Budget,
			"spent":     swarm.Spent,
			"allocated": swarm.Allocated,
			"status":    swarm.Status,
		},
	})

	if swarm.RootMissionID != "" {
		g.Edges = append(g.Edges, GraphEdge{
			Source: swarm.RootMissionID,
			Target: swarm.ID,
			Type:   EdgeTypeDependsOn,
			Label:  "ORCHESTRATED_BY",
		})
	}

	// 3. Orchestrator Agent Node
	addNode(GraphNode{
		ID:    swarm.OrchestratorAgentID,
		Type:  NodeTypeAgent,
		Label: fmt.Sprintf("Orchestrator: %s", swarm.OrchestratorAgentID),
		Metadata: map[string]interface{}{
			"role": string(RoleOrchestrator),
		},
	})

	g.Edges = append(g.Edges, GraphEdge{
		Source: swarm.ID,
		Target: swarm.OrchestratorAgentID,
		Type:   EdgeTypeAssigned,
		Label:  "ORCHESTRATED_BY",
	})

	// 4. Task Nodes & Dependency Edges
	for _, t := range tasks {
		addNode(GraphNode{
			ID:    t.TaskID,
			Type:  NodeTypeTask,
			Label: fmt.Sprintf("Task: %s", t.Name),
			Metadata: map[string]interface{}{
				"capability": t.RequiredCapability,
				"role":       string(t.AssignedRole),
				"status":     string(t.Status),
				"budget":     t.Budget,
				"spent":      t.Spent,
			},
		})

		// Edge from Swarm to Task
		g.Edges = append(g.Edges, GraphEdge{
			Source: swarm.ID,
			Target: t.TaskID,
			Type:   EdgeTypeDependsOn,
			Label:  "CONTAINS_TASK",
		})

		// Assigned Agent
		if t.AssignedAgentID != "" {
			addNode(GraphNode{
				ID:    t.AssignedAgentID,
				Type:  NodeTypeAgent,
				Label: fmt.Sprintf("Worker: %s", t.AssignedAgentID),
				Metadata: map[string]interface{}{
					"role":       string(t.AssignedRole),
					"capability": t.RequiredCapability,
				},
			})

			g.Edges = append(g.Edges, GraphEdge{
				Source: t.TaskID,
				Target: t.AssignedAgentID,
				Type:   EdgeTypeAssigned,
				Label:  "ASSIGNED_TO",
			})
		}

		// Task Dependencies
		for _, depID := range t.Dependencies {
			g.Edges = append(g.Edges, GraphEdge{
				Source: depID,
				Target: t.TaskID,
				Type:   EdgeTypeDependsOn,
				Label:  "DEPENDS_ON",
			})
		}

		// Result & Validation Edges
		if t.ResultData != "" {
			resNodeID := fmt.Sprintf("res_%s", t.TaskID)
			addNode(GraphNode{
				ID:    resNodeID,
				Type:  NodeTypeService,
				Label: fmt.Sprintf("Result: %s", t.RequiredCapability),
				Metadata: map[string]interface{}{
					"checksum": t.ResultChecksum,
					"status":   t.ValidationStatus,
				},
			})

			workerID := t.AssignedAgentID
			if workerID == "" {
				workerID = swarm.OrchestratorAgentID
			}

			g.Edges = append(g.Edges, GraphEdge{
				Source: workerID,
				Target: resNodeID,
				Type:   EdgeTypeProduced,
				Label:  "PRODUCED",
			})

			if t.AssignedRole == RoleVerifier || t.RequiredCapability == "verification" {
				g.Edges = append(g.Edges, GraphEdge{
					Source: workerID,
					Target: swarm.OrchestratorAgentID,
					Type:   EdgeTypeValidatedBy,
					Label:  "VALIDATED_BY",
				})
			}
		}
	}

	// 5. Payment Nodes & Edges from Hires
	for _, h := range hires {
		if h.PaymentIntentID != "" {
			addNode(GraphNode{
				ID:    h.PaymentIntentID,
				Type:  NodeTypePayment,
				Label: fmt.Sprintf("Payment: %s %s", h.Price, h.Asset),
				Metadata: map[string]interface{}{
					"intent_id": h.PaymentIntentID,
					"amount":    h.Price,
					"asset":     h.Asset,
					"status":    "CONFIRMED",
				},
			})

			g.Edges = append(g.Edges, GraphEdge{
				Source: h.ID,
				Target: h.PaymentIntentID,
				Type:   EdgeTypePaid,
				Label:  "PAID",
			})
		}
	}

	return g
}
