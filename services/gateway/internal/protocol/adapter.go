package protocol

import (
	"context"
	"errors"
)

// ExternalAgentAdapter defines the programmatic contract for external AI agents (Section 37).
type ExternalAgentAdapter interface {
	Discover(ctx context.Context, capability string) ([]*AgentManifest, error)
	Describe(ctx context.Context, agentID string) (*AgentManifest, error)
	RequestService(ctx context.Context, req *ServiceRequest) (*ProtocolQuote, error)
	Negotiate(ctx context.Context, proposal *NegotiationPayload) (*NegotiationPayload, error)
	AcceptContract(ctx context.Context, contractID string) (*ProtocolContract, error)
	SubmitResult(ctx context.Context, result *ResultSubmittedPayload) (*QualityEvaluationResult, error)
	RequestPayment(ctx context.Context, req *PaymentRequestPayload) (*PaymentDecision, error)
	SendHeartbeat(ctx context.Context, hb *AgentHeartbeat) error
}

// LocalGatewayAdapter is an adapter that directly interfaces with the in-process ProtocolService.
type LocalGatewayAdapter struct {
	service *ProtocolService
	agentID string
	secret  string
}

// NewLocalGatewayAdapter creates a LocalGatewayAdapter for external agents.
func NewLocalGatewayAdapter(service *ProtocolService, agentID string, secret string) *LocalGatewayAdapter {
	return &LocalGatewayAdapter{
		service: service,
		agentID: agentID,
		secret:  secret,
	}
}

func (a *LocalGatewayAdapter) Discover(ctx context.Context, capability string) ([]*AgentManifest, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.DiscoverAgents(ctx, capability)
}

func (a *LocalGatewayAdapter) Describe(ctx context.Context, agentID string) (*AgentManifest, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.GetAgentManifest(ctx, agentID)
}

func (a *LocalGatewayAdapter) RequestService(ctx context.Context, req *ServiceRequest) (*ProtocolQuote, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.RequestService(ctx, req)
}

func (a *LocalGatewayAdapter) Negotiate(ctx context.Context, proposal *NegotiationPayload) (*NegotiationPayload, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.Negotiate(ctx, proposal)
}

func (a *LocalGatewayAdapter) AcceptContract(ctx context.Context, contractID string) (*ProtocolContract, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.AcceptContract(ctx, contractID)
}

func (a *LocalGatewayAdapter) SubmitResult(ctx context.Context, result *ResultSubmittedPayload) (*QualityEvaluationResult, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.SubmitResult(ctx, result)
}

func (a *LocalGatewayAdapter) RequestPayment(ctx context.Context, req *PaymentRequestPayload) (*PaymentDecision, error) {
	if a.service == nil {
		return nil, errors.New("protocol service not initialized")
	}
	return a.service.RequestPayment(ctx, req)
}

func (a *LocalGatewayAdapter) SendHeartbeat(ctx context.Context, hb *AgentHeartbeat) error {
	if a.service == nil {
		return errors.New("protocol service not initialized")
	}
	return a.service.RecordHeartbeat(ctx, hb)
}
