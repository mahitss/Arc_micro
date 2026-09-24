package protocol

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

var (
	ErrAuthenticationFailed = errors.New("protocol gateway authentication failed (INV-161)")
	ErrIdempotencyHit       = errors.New("idempotent duplicate request")
)

// Authenticator verifies agent credentials.
type Authenticator interface {
	Authenticate(ctx context.Context, agentID string, secret string) (bool, error)
	GetAgentSecret(ctx context.Context, agentID string) (string, error)
}

// MemoryAuthenticator provides mock authentication for tests.
type MemoryAuthenticator struct {
	secrets map[string]string
}

func NewMemoryAuthenticator() *MemoryAuthenticator {
	return &MemoryAuthenticator{
		secrets: map[string]string{
			"agent_research_01":  "sec_res_secret_12345",
			"agent_security_02":  "sec_sec_secret_67890",
			"agent_verifier_03":  "sec_ver_secret_11223",
			"agent_operator_00":  "sec_opr_secret_99887",
		},
	}
}

func (a *MemoryAuthenticator) Authenticate(ctx context.Context, agentID string, secret string) (bool, error) {
	expected, ok := a.secrets[agentID]
	if !ok {
		return false, errors.New("agent not found in auth directory")
	}
	return expected == secret, nil
}

func (a *MemoryAuthenticator) GetAgentSecret(ctx context.Context, agentID string) (string, error) {
	expected, ok := a.secrets[agentID]
	if !ok {
		return "", errors.New("agent not found")
	}
	return expected, nil
}

// ProtocolGateway parses, authenticates, validates, and routes external agent protocol messages.
type ProtocolGateway struct {
	validator   *MessageValidator
	signer      *ProtocolSigner
	auth        Authenticator
	rateLimiter *RateLimiter
	store       ProtocolStore
	service     *ProtocolService
}

// NewProtocolGateway constructs a ProtocolGateway instance.
func NewProtocolGateway(
	val *MessageValidator,
	signer *ProtocolSigner,
	auth Authenticator,
	rl *RateLimiter,
	store ProtocolStore,
	service *ProtocolService,
) *ProtocolGateway {
	if val == nil {
		val = NewMessageValidator()
	}
	if signer == nil {
		signer = NewProtocolSigner(nil)
	}
	if auth == nil {
		auth = NewMemoryAuthenticator()
	}
	if rl == nil {
		rl = NewRateLimiter(100, time.Minute)
	}
	if store == nil {
		store = NewMemoryProtocolStore()
	}

	return &ProtocolGateway{
		validator:   val,
		signer:      signer,
		auth:        auth,
		rateLimiter: rl,
		store:       store,
		service:     service,
	}
}

// SetService binds the ProtocolService to the gateway.
func (gw *ProtocolGateway) SetService(service *ProtocolService) {
	gw.service = service
}

// ProcessIncomingMessage is the unified entrypoint for all protocol messages (Section 22).
func (gw *ProtocolGateway) ProcessIncomingMessage(ctx context.Context, msg *ProtocolMessage) (*ProtocolMessage, error) {
	startTime := time.Now()
	tenantID := msg.TenantID
	if tenantID == "" {
		tenantID = "tenant_default"
		msg.TenantID = tenantID
	}

	// 1. Schema Validation
	if err := gw.validator.ValidateEnvelope(msg); err != nil {
		gw.recordTraffic(ctx, msg, "REJECTED", err.Error(), startTime)
		return nil, fmt.Errorf("%w: %s", ErrMalformedEnvelope, err.Error())
	}

	// 2. Rate Limiting Check (Section 43)
	if err := gw.rateLimiter.CheckLimit(tenantID, msg.SenderID, msg.MessageType); err != nil {
		gw.recordTraffic(ctx, msg, "RATE_LIMITED", err.Error(), startTime)
		return nil, err
	}

	// 3. Idempotency Check (Section 24 & INV-169)
	if msg.IdempotencyKey != "" {
		cached, err := gw.store.GetMessageByIdempotency(ctx, tenantID, msg.IdempotencyKey)
		if err == nil && cached != nil {
			gw.recordTraffic(ctx, msg, "PROCESSED_IDEMPOTENT", "", startTime)
			return cached, nil
		}
	}

	// 4. Authentication & Signature Verification (Section 18 & 19)
	if msg.Signature != "" {
		secret, err := gw.auth.GetAgentSecret(ctx, msg.SenderID)
		if err != nil {
			gw.recordTraffic(ctx, msg, "AUTH_FAILED", "unknown agent key", startTime)
			return nil, ErrAuthenticationFailed
		}
		if err := gw.signer.VerifyMessageHMAC(msg, secret); err != nil {
			gw.recordTraffic(ctx, msg, "SIGNATURE_FAILED", err.Error(), startTime)
			return nil, fmt.Errorf("%w: %s", ErrSignatureFailed, err.Error())
		}
	}

	// 5. Domain Routing
	responsePayload, err := gw.routeMessage(ctx, msg)
	if err != nil {
		gw.recordTraffic(ctx, msg, "FAILED", err.Error(), startTime)
		return nil, err
	}

	rawResp, err := json.Marshal(responsePayload)
	if err != nil {
		return nil, err
	}

	responseMsg := &ProtocolMessage{
		ProtocolVersion: ProtocolVersion,
		MessageType:     msg.MessageType + "Response",
		MessageID:       fmt.Sprintf("resp_%s", msg.MessageID),
		Timestamp:       time.Now().UTC(),
		SenderID:        "agentpay_gateway",
		RecipientID:     msg.SenderID,
		CorrelationID:   msg.CorrelationID,
		CausationID:     msg.MessageID,
		IdempotencyKey:  msg.IdempotencyKey,
		TenantID:        tenantID,
		Payload:         rawResp,
	}

	// 6. Save message for audit and idempotency
	_ = gw.store.SaveMessage(ctx, msg)
	_ = gw.store.SaveMessage(ctx, responseMsg)

	gw.recordTraffic(ctx, msg, "PROCESSED", "", startTime)
	return responseMsg, nil
}

func (gw *ProtocolGateway) routeMessage(ctx context.Context, msg *ProtocolMessage) (interface{}, error) {
	if gw.service == nil {
		return map[string]string{"status": "GATEWAY_ONLINE"}, nil
	}

	switch msg.MessageType {
	case MsgAgentAnnounce:
		var manifest AgentManifest
		if err := json.Unmarshal(msg.Payload, &manifest); err != nil {
			return nil, err
		}
		return gw.service.RegisterAgent(ctx, &manifest)

	case MsgCapabilityQuery:
		var query map[string]string
		_ = json.Unmarshal(msg.Payload, &query)
		cap := query["capability"]
		return gw.service.DiscoverAgents(ctx, cap)

	case MsgServiceRequest:
		var req ServiceRequest
		if err := json.Unmarshal(msg.Payload, &req); err != nil {
			return nil, err
		}
		return gw.service.RequestService(ctx, &req)

	case MsgNegotiationRequest:
		var proposal NegotiationPayload
		if err := json.Unmarshal(msg.Payload, &proposal); err != nil {
			return nil, err
		}
		return gw.service.Negotiate(ctx, &proposal)

	case MsgContractProposal:
		var contract ProtocolContract
		if err := json.Unmarshal(msg.Payload, &contract); err != nil {
			return nil, err
		}
		return gw.service.ProposeContract(ctx, &contract)

	case MsgResultSubmitted:
		var result ResultSubmittedPayload
		if err := json.Unmarshal(msg.Payload, &result); err != nil {
			return nil, err
		}
		return gw.service.SubmitResult(ctx, &result)

	case MsgPaymentRequest:
		var payReq PaymentRequestPayload
		if err := json.Unmarshal(msg.Payload, &payReq); err != nil {
			return nil, err
		}
		return gw.service.RequestPayment(ctx, &payReq)

	case MsgAgentHeartbeat:
		var hb AgentHeartbeat
		if err := json.Unmarshal(msg.Payload, &hb); err != nil {
			return nil, err
		}
		return map[string]string{"status": "ACK"}, gw.service.RecordHeartbeat(ctx, &hb)

	case MsgPaymentConfirmed, MsgPaymentAuthorized, MsgPaymentSubmitted:
		// External agent sending payment confirmation/authorization is invalid (INV-174)
		return map[string]string{"status": "IGNORED", "reason": "external payment confirmation prohibited (INV-174)"}, nil

	default:
		return map[string]string{"status": "ACCEPTED", "message_type": msg.MessageType}, nil
	}
}

func (gw *ProtocolGateway) recordTraffic(ctx context.Context, msg *ProtocolMessage, status, errStr string, start time.Time) {
	entry := &ProtocolTrafficEntry{
		TrafficID:     fmt.Sprintf("trf_%d", time.Now().UnixNano()),
		Timestamp:     time.Now().UTC(),
		MessageType:   msg.MessageType,
		SenderID:      msg.SenderID,
		RecipientID:   msg.RecipientID,
		Status:        status,
		CorrelationID: msg.CorrelationID,
		LatencyMs:     time.Since(start).Milliseconds(),
		Error:         errStr,
		TenantID:      msg.TenantID,
	}
	_ = gw.store.RecordTraffic(ctx, entry)
}
