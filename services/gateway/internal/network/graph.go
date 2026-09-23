package network

import (
	"context"
	"fmt"
	"strings"
)

// NetworkGraphStorage extends storage operations for graph construction.
type NetworkGraphStorage interface {
	ContractStorageRepository
	ListDisputes(ctx context.Context, orgID string) ([]*DisputeRecord, error)
}

// NetworkGraphService computes the topological graph of agents, capabilities, and contracts.
type NetworkGraphService struct {
	repo NetworkGraphStorage
}

// NewNetworkGraphService creates a new NetworkGraphService.
func NewNetworkGraphService(repo NetworkGraphStorage) *NetworkGraphService {
	return &NetworkGraphService{repo: repo}
}

// BuildGraph constructs the complete node and edge topology for an organization or global view.
func (s *NetworkGraphService) BuildGraph(ctx context.Context, orgID string) (*NetworkGraph, error) {
	identities, err := s.repo.ListNetworkIdentities(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list identities: %w", err)
	}

	contracts, err := s.repo.ListServiceContracts(ctx, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list contracts: %w", err)
	}

	nodeMap := make(map[string]GraphNode)
	edges := make([]GraphEdge, 0)

	// 1. Add Agent Nodes
	for _, id := range identities {
		nodeMap[id.AgentID] = GraphNode{
			ID:     id.AgentID,
			Type:   "AGENT",
			Label:  id.DisplayName,
			Status: string(id.Status),
			Metadata: map[string]interface{}{
				"organization_id": id.OrganizationID,
				"capabilities":    id.Capabilities,
				"version":         id.Version,
			},
		}

		// Add Capability Nodes linked to Agent
		for _, capStr := range id.Capabilities {
			capNodeID := "cap_" + strings.ReplaceAll(capStr, "@", "_")
			if _, exists := nodeMap[capNodeID]; !exists {
				nodeMap[capNodeID] = GraphNode{
					ID:    capNodeID,
					Type:  "CAPABILITY",
					Label: capStr,
				}
			}
			edges = append(edges, GraphEdge{
				Source: id.AgentID,
				Target: capNodeID,
				Type:   "OFFERS",
				Label:  "offers capability",
			})
		}
	}

	// 2. Add Contract Nodes and Directed Edges
	for _, c := range contracts {
		contractNodeID := "contract_" + c.ContractID
		nodeMap[contractNodeID] = GraphNode{
			ID:     contractNodeID,
			Type:   "CONTRACT",
			Label:  fmt.Sprintf("%s (%s USDC)", c.Capability, c.Price),
			Status: string(c.State),
			Metadata: map[string]interface{}{
				"price":            c.Price,
				"currency":         c.Currency,
				"delegation_depth": c.DelegationDepth,
			},
		}

		// Requester -> Contract
		edges = append(edges, GraphEdge{
			Source: c.RequesterAgentID,
			Target: contractNodeID,
			Type:   "HIRED",
			Label:  fmt.Sprintf("hired for %s", c.Price),
		})

		// Contract -> Provider
		edgeType := "ASSIGNED_TO"
		if c.DelegationDepth > 0 {
			edgeType = "DELEGATED_TO"
		}
		edges = append(edges, GraphEdge{
			Source: contractNodeID,
			Target: c.ProviderAgentID,
			Type:   edgeType,
			Label:  fmt.Sprintf("assigned depth %d", c.DelegationDepth),
		})

		// If Completed, add PAID edge
		if c.State == ContractCompleted {
			edges = append(edges, GraphEdge{
				Source: c.RequesterAgentID,
				Target: c.ProviderAgentID,
				Type:   "PAID",
				Label:  fmt.Sprintf("paid %s %s", c.Price, c.Currency),
			})
		}
	}

	nodes := make([]GraphNode, 0, len(nodeMap))
	for _, n := range nodeMap {
		nodes = append(nodes, n)
	}

	return &NetworkGraph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}
