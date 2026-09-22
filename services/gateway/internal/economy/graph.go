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
