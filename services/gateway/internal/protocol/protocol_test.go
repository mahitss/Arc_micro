package protocol

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"
	"time"
)

func TestProtocol_EnvelopeValidation(t *testing.T) {
	val := NewMessageValidator()

	// 1. Valid envelope
	validMsg := &ProtocolMessage{
		ProtocolVersion: ProtocolVersion,
		MessageType:     MsgServiceRequest,
		MessageID:       "msg_123",
		Timestamp:       time.Now().UTC(),
		SenderID:        "agent_a",
		RecipientID:     "agentpay_gateway",
		CorrelationID:   "corr_123",
		Payload:         []byte(`{"hello":"world"}`),
	}
	if err := val.ValidateEnvelope(validMsg); err != nil {
		t.Fatalf("expected valid envelope to pass, got: %v", err)
	}

	// 2. Unsupported version
	badVerMsg := *validMsg
	badVerMsg.ProtocolVersion = "2.0"
	if err := val.ValidateEnvelope(&badVerMsg); err == nil {
		t.Fatalf("expected unsupported version 2.0 to fail closed")
	}

	// 3. Missing MessageID
	badIDMsg := *validMsg
	badIDMsg.MessageID = ""
	if err := val.ValidateEnvelope(&badIDMsg); err == nil {
		t.Fatalf("expected missing message_id to fail")
	}

	// 4. Oversized payload
	oversizedMsg := *validMsg
	oversizedMsg.Payload = make([]byte, MaxMessagePayloadBytes+10)
	if err := val.ValidateEnvelope(&oversizedMsg); err == nil {
		t.Fatalf("expected payload > 10MB to fail")
	}
}

func TestProtocol_SignatureAndReplayProtection(t *testing.T) {
	nonceStore := NewMemoryNonceStore()
	signer := NewProtocolSigner(nonceStore)
	secret := "test_secret_key_12345"

	msg := &ProtocolMessage{
		ProtocolVersion: ProtocolVersion,
		MessageType:     MsgServiceRequest,
		MessageID:       "msg_sig_01",
		Timestamp:       time.Now().UTC(),
		SenderID:        "agent_research_01",
		RecipientID:     "agentpay_gateway",
		CorrelationID:   "corr_sig_01",
		Nonce:           "nonce_random_abc_1",
		Payload:         []byte(`{"service":"sec-audit"}`),
	}

	// Sign
	sig := SignMessageHMAC(msg, secret)
	msg.Signature = sig

	// 1. First verification should succeed
	if err := signer.VerifyMessageHMAC(msg, secret); err != nil {
		t.Fatalf("expected signature verification to succeed, got: %v", err)
	}

	// 2. Replay with identical nonce must fail (INV-170)
	if err := signer.VerifyMessageHMAC(msg, secret); err != ErrReplayedNonce {
		t.Fatalf("expected replay attack with reused nonce to return ErrReplayedNonce, got: %v", err)
	}

	// 3. Expired timestamp must fail (INV-171)
	expiredMsg := *msg
	expiredMsg.MessageID = "msg_sig_02"
	expiredMsg.Nonce = "nonce_random_abc_2"
	expiredMsg.Timestamp = time.Now().UTC().Add(-10 * time.Minute)
	expiredMsg.Signature = SignMessageHMAC(&expiredMsg, secret)

	if err := signer.VerifyMessageHMAC(&expiredMsg, secret); err != ErrExpiredTimestamp {
		t.Fatalf("expected expired timestamp to fail with ErrExpiredTimestamp, got: %v", err)
	}

	// 4. Signature mismatch
	tamperedMsg := *msg
	tamperedMsg.Nonce = "nonce_random_abc_3"
	tamperedMsg.Signature = "bad_signature_hex"
	if err := signer.VerifyMessageHMAC(&tamperedMsg, secret); err != ErrSignatureMismatch {
		t.Fatalf("expected tampered signature to return ErrSignatureMismatch, got: %v", err)
	}
}

func TestProtocol_QualityGate(t *testing.T) {
	gate := NewResultQualityGate()

	validResult := &ResultSubmittedPayload{
		ResultID:      "res_01",
		ContractID:    "ctr_01",
		TaskID:        "task_scan_01",
		SchemaVersion: "1.0",
		DeliverableData: map[string]interface{}{
			"scan_target": "0x5042",
			"findings":    []interface{}{"zero critical issues"},
		},
		QualityMetadata: map[string]interface{}{
			"confidence": 0.98,
		},
		SubmittedAt: time.Now().UTC(),
	}

	// Compute valid hash
	dataBytes, _ := json.Marshal(validResult.DeliverableData)
	computedH := sha256.Sum256(dataBytes)
	validResult.ResultHash = hex.EncodeToString(computedH[:])
	eval, err := gate.EvaluateResult(validResult, nil)
	if err != nil {
		t.Fatalf("expected valid deliverable to pass quality gate, got: %v", err)
	}
	if eval.Decision != DecisionAccept || !eval.EligibleForPay {
		t.Fatalf("expected DecisionAccept and eligible for pay, got: %v", eval)
	}

	// Hash mismatch triggers dispute
	mismatchResult := *validResult
	mismatchResult.ResultHash = "0000000000000000000000000000000000000000000000000000000000000000"
	evalM, errM := gate.EvaluateResult(&mismatchResult, nil)
	if errM != ErrResultChecksumMismatch || evalM.Decision != DecisionDispute {
		t.Fatalf("expected hash mismatch to trigger dispute, got: %v, err: %v", evalM, errM)
	}

	// Low confidence triggers retry
	lowConfResult := *validResult
	lowConfResult.QualityMetadata = map[string]interface{}{"confidence": 0.50}
	lowConfResult.ResultHash = "" // bypass hash check
	evalL, errL := gate.EvaluateResult(&lowConfResult, nil)
	if errL != ErrResultQualityTooLow || evalL.Decision != DecisionRetry {
		t.Fatalf("expected low confidence to trigger retry, got: %v, err: %v", evalL, errL)
	}
}

func TestProtocol_PaymentBoundaryEnforcement(t *testing.T) {
	ctx := context.Background()
	boundary := NewPaymentBoundary(nil, nil)

	// 1. Prohibit payment without deliverable verification (INV-173)
	payReq := &PaymentRequestPayload{
		ContractID:         "ctr_01",
		MilestoneID:        "m1",
		Amount:             "18.50",
		Currency:           "USDC",
		RecipientServiceID: "sec-audit",
		ResultReference:    "",
	}
	_, err := boundary.ProcessPaymentRequest(ctx, payReq, "tenant_default", "agent_1", false)
	if err != ErrDeliverableNotVerified {
		t.Fatalf("expected ErrDeliverableNotVerified, got: %v", err)
	}

	// 2. Prohibit raw recipient blockchain address from external agent (INV-163)
	rawAddrReq := *payReq
	rawAddrReq.RecipientServiceID = "0xdead00000000000000000000000000000000beef"
	_, errRaw := boundary.ProcessPaymentRequest(ctx, &rawAddrReq, "tenant_default", "agent_1", true)
	if errRaw != ErrRawRecipientProhibited {
		t.Fatalf("expected ErrRawRecipientProhibited, got: %v", errRaw)
	}

	// 3. Valid service payout request resolves recipient securely
	dec, errValid := boundary.ProcessPaymentRequest(ctx, payReq, "tenant_default", "agent_1", true)
	if errValid != nil || dec.Decision != "AUTHORIZED" {
		t.Fatalf("expected authorized payment decision, got: %v (err: %v)", dec, errValid)
	}
}

// Section 68: TEST_EXTERNAL_AGENT_TO_SETTLEMENT
func TestProtocol_ExternalAgentToSettlement_EndToEnd(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryProtocolStore()
	svc := NewProtocolService(store, nil, nil, nil, nil)
	gw := NewProtocolGateway(nil, nil, nil, nil, store, svc)
	svc.paymentBoundary = NewPaymentBoundary(nil, nil)

	// 1. External Agent announces itself
	announcePayload, _ := json.Marshal(&AgentManifest{
		ProtocolVersion: ProtocolVersion,
		AgentID:         "agent_external_e2e",
		OrganizationID:  "org_e2e",
		DisplayName:     "E2E Test Agent",
		Capabilities: []CapabilityDescriptor{
			{
				CapabilityID:       "security-audit@1.0",
				Name:               "Security Audit",
				Version:            "1.0",
				EstimatedLatencyMs: 200,
				PricingModel:       "FIXED",
			},
		},
		Pricing:      []ManifestPricing{{Capability: "security-audit@1.0", BasePrice: "18.50", Currency: "USDC"}},
		Availability: "AVAILABLE",
	})

	msgAnnounce := &ProtocolMessage{
		ProtocolVersion: ProtocolVersion,
		MessageType:     MsgAgentAnnounce,
		MessageID:       "msg_e2e_01",
		Timestamp:       time.Now().UTC(),
		SenderID:        "agent_external_e2e",
		RecipientID:     "agentpay_gateway",
		CorrelationID:   "corr_e2e",
		Payload:         announcePayload,
	}

	resp1, err := gw.ProcessIncomingMessage(ctx, msgAnnounce)
	if err != nil {
		t.Fatalf("AgentAnnounce failed: %v", err)
	}
	if resp1.MessageType != "AgentAnnounceResponse" {
		t.Fatalf("unexpected response message type: %s", resp1.MessageType)
	}

	// 2. Discover capabilities
	discovered, err := svc.DiscoverAgents(ctx, "security-audit@1.0")
	if err != nil || len(discovered) == 0 {
		t.Fatalf("DiscoverAgents failed: %v", err)
	}

	// 3. Request service & obtain quote
	quote, err := svc.RequestService(ctx, &ServiceRequest{
		RequestID:   "req_e2e_01",
		RequesterID: "agent_research_01",
		Capability:  "security-audit@1.0",
		InputData:   map[string]interface{}{"target": "0x5042"},
		Deadline:    time.Now().UTC().Add(2 * time.Hour),
		BudgetCap:   "50.00",
	})
	if err != nil || quote.Amount != "18.50" {
		t.Fatalf("RequestService failed: %v", err)
	}

	// 4. Form contract
	contract, err := svc.ProposeContract(ctx, &ProtocolContract{
		ContractID:   "ctr_e2e_01",
		TenantID:     "tenant_default",
		RequesterID:  "agent_research_01",
		ProviderID:   "agent_external_e2e",
		Capability:   "security-audit@1.0",
		TotalAmount:  "18.50",
		Currency:     "USDC",
		Deadline:     time.Now().UTC().Add(2 * time.Hour),
		Deliverables: []string{"sec_report"},
	})
	if err != nil || contract.State != ContractProposed {
		t.Fatalf("ProposeContract failed: %v", err)
	}

	// 5. Accept contract
	accepted, err := svc.AcceptContract(ctx, contract.ContractID)
	if err != nil || accepted.State != ContractActive {
		t.Fatalf("AcceptContract failed: %v", err)
	}

	// 6. Submit task result
	resultPayload := &ResultSubmittedPayload{
		ResultID:   "res_e2e_01",
		ContractID: accepted.ContractID,
		TaskID:     "task_01",
		DeliverableData: map[string]interface{}{
			"audit_result": "PASSED_ZERO_VULNS",
		},
		QualityMetadata: map[string]interface{}{
			"confidence": 0.99,
		},
		SubmittedAt: time.Now().UTC(),
	}

	eval, err := svc.SubmitResult(ctx, resultPayload)
	if err != nil || eval.Decision != DecisionAccept {
		t.Fatalf("SubmitResult failed: %v", err)
	}

	// 7. Request payment payout
	decision, err := svc.RequestPayment(ctx, &PaymentRequestPayload{
		ContractID:         accepted.ContractID,
		MilestoneID:        "m1",
		Amount:             "18.50",
		Currency:           "USDC",
		RecipientServiceID: "sec-audit",
		ResultReference:    resultPayload.ResultID,
	})
	if err != nil || decision.Decision != "AUTHORIZED" {
		t.Fatalf("RequestPayment failed: %v", err)
	}

	// 8. Assert contract completed and audit traffic recorded
	finalContract, _ := svc.GetContract(ctx, accepted.ContractID)
	if finalContract.State != ContractCompleted {
		t.Fatalf("expected contract completed, got: %s", finalContract.State)
	}

	traffic, _ := svc.GetTraffic(ctx, "tenant_default", 10)
	if len(traffic) == 0 {
		t.Fatalf("expected recorded traffic entries in protocol store")
	}
}
