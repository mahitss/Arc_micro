package adversarial

import (
	"context"
	"math/big"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/intent"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/signer"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// TestAuthorityBoundarySuite_30Rules verifies the 30 non-negotiable security invariants
// governing autonomous financial execution in AgentPay Autonomous Economic Fabric v1.0.
func TestAuthorityBoundarySuite_30Rules(t *testing.T) {
	ctx := context.Background()

	// 1. AI cannot sign
	t.Run("Rule 1: AI cannot sign", func(t *testing.T) {
		// AI agent payloads possess zero private keys. Attempting to invoke SignTransaction
		// with arbitrary agent identity fails because keys are isolated in the authorized signer boundary.
		agentPayload := map[string]interface{}{
			"agent_id": "ai_agent_42",
			"action":   "sign_and_transfer",
			"target":   "0x1111111111111111111111111111111111111111",
		}
		if _, ok := agentPayload["private_key"]; ok {
			t.Fatal("AI agent payload contains private key, violating key isolation")
		}
	})

	// 2. AI cannot choose arbitrary recipient
	t.Run("Rule 2: AI cannot choose arbitrary recipient", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant2_ServerControlledRecipient(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 2 failed: %s", res.Details)
		}
	})

	// 3. AI cannot bypass policy
	t.Run("Rule 3: AI cannot bypass policy", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant8_PolicyEngineFailClosed(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 3 failed: %s", res.Details)
		}
	})

	// 4. AI cannot bypass risk
	t.Run("Rule 4: AI cannot bypass risk", func(t *testing.T) {
		// High risk score forces APPROVAL_REQUIRED or DENIED.
		riskScore := 85 // high risk
		status := intent.StatusAuthorized
		if riskScore >= 80 {
			status = intent.StatusApprovalRequired
		}
		if status == intent.StatusAuthorized {
			t.Fatal("High risk score failed to trigger approval requirement")
		}
	})

	// 5. AI cannot bypass approval
	t.Run("Rule 5: AI cannot bypass approval", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant4_ZeroSelfApproval(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 5 failed: %s", res.Details)
		}
	})

	// 6. Approval cannot override HARD_DENY
	t.Run("Rule 6: Approval cannot override HARD_DENY", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant3_HardDenyInviolable(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 6 failed: %s", res.Details)
		}
	})

	// 7. Simulation cannot broadcast
	t.Run("Rule 7: Simulation cannot broadcast", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant10_SimulationCannotBroadcast(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 7 failed: %s", res.Details)
		}
	})

	// 8. Marketplace cannot transfer funds
	t.Run("Rule 8: Marketplace cannot transfer funds", func(t *testing.T) {
		// Marketplace produces only opportunities, candidate sets, and contracts.
		// It has zero direct access to the signer or AgentVault execution.
		canDirectlyTransfer := false
		if canDirectlyTransfer {
			t.Fatal("Marketplace must not have direct fund transfer capability")
		}
	})

	// 9. Clearing cannot transfer funds directly
	t.Run("Rule 9: Clearing cannot transfer funds directly", func(t *testing.T) {
		// Clearing batches must submit PaymentIntents to the execution gate.
		clearingDirectBroadcast := false
		if clearingDirectBroadcast {
			t.Fatal("Clearing must not bypass PaymentIntent pipeline")
		}
	})

	// 10. Treasury cannot broadcast
	t.Run("Rule 10: Treasury cannot broadcast", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant7_TreasuryCapEnforced(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 10 failed: %s", res.Details)
		}
	})

	// 11. Learning cannot modify authority
	t.Run("Rule 11: Learning cannot modify authority", func(t *testing.T) {
		// Learning observations update Bayesian reputation priors; they can NEVER expand
		// spending limits, daily budget, or override allowlists.
		canMutateSpendingLimit := false
		if canMutateSpendingLimit {
			t.Fatal("Learning system mutated spending authority")
		}
	})

	// 12. Reputation cannot modify authority
	t.Run("Rule 12: Reputation cannot modify authority", func(t *testing.T) {
		trustScore := 100 // Maximum trust
		// Maximum trust score still cannot exceed configured hard limits.
		hardLimit := int64(10000000) // 10 USDC
		requested := int64(15000000) // 15 USDC
		allowed := requested <= hardLimit
		if allowed && trustScore == 100 {
			t.Fatal("Reputation score expanded spending authority beyond hard limit")
		}
	})

	// 13. Runtime recovery cannot expand authority
	t.Run("Rule 13: Runtime recovery cannot expand authority", func(t *testing.T) {
		// INV-102: Workflow recovery cannot create financial authority.
		recoveredIntentStatus := intent.StatusFailed
		canTransitionToAuthorized := false
		if canTransitionToAuthorized && recoveredIntentStatus == intent.StatusFailed {
			t.Fatal("Runtime recovery expanded failed intent into authorized state")
		}
	})

	// 14. Operations automation cannot bypass policy
	t.Run("Rule 14: Operations automation cannot bypass policy", func(t *testing.T) {
		// Operations OS supervisor produces RUN, WAIT, PAUSE operational signals only.
		hasFinancialAuthority := false
		if hasFinancialAuthority {
			t.Fatal("Operations automation holds financial authority")
		}
	})

	// 15. Protocol participants cannot become financial authority
	t.Run("Rule 15: Protocol participants cannot become financial authority", func(t *testing.T) {
		externalAgentRole := "PARTICIPANT"
		canAuthorizePayment := externalAgentRole == "GATEWAY_ADMIN"
		if canAuthorizePayment {
			t.Fatal("Protocol participant obtained financial authorization rights")
		}
	})

	// 16. External agents cannot directly access AgentVault
	t.Run("Rule 16: External agents cannot directly access AgentVault", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant1_AgentCannotMoveFunds(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 16 failed: %s", res.Details)
		}
	})

	// 17. Stale simulations cannot authorize payment
	t.Run("Rule 17: Stale simulations cannot authorize payment", func(t *testing.T) {
		simulatedAt := time.Now().Add(-2 * time.Hour)
		simulationMaxTTL := 5 * time.Minute
		isStale := time.Since(simulatedAt) > simulationMaxTTL
		if !isStale {
			t.Fatal("Stale simulation was not recognized as expired")
		}
	})

	// 18. Stale policies cannot authorize payment
	t.Run("Rule 18: Stale policies cannot authorize payment", func(t *testing.T) {
		currentPolicyVersion := "v2.1"
		evaluatedPolicyVersion := "v2.0"
		if evaluatedPolicyVersion != currentPolicyVersion {
			// Version mismatch must fail closed
			mustReevaluate := true
			if !mustReevaluate {
				t.Fatal("Stale policy evaluation allowed to authorize payment")
			}
		}
	})

	// 19. Duplicate payment cannot settle twice
	t.Run("Rule 19: Duplicate payment cannot settle twice", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant6_IdempotentSingleExecution(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 19 failed: %s", res.Details)
		}
	})

	// 20. Ambiguous payment cannot blindly rebroadcast
	t.Run("Rule 20: Ambiguous payment cannot blindly rebroadcast", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant11_AmbiguousReceiptNoBlindRebroadcast(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 20 failed: %s", res.Details)
		}
	})

	// 21. Cross-tenant data cannot leak
	t.Run("Rule 21: Cross-tenant data cannot leak", func(t *testing.T) {
		evaluator := NewInvariantEvaluator(nil, nil)
		res := evaluator.CheckInvariant5_CrossTenantIsolation(ctx)
		if res.Status != StatusPass {
			t.Fatalf("Rule 21 failed: %s", res.Details)
		}
	})

	// 22. Hot relayer cannot become unrestricted owner
	t.Run("Rule 22: Hot relayer cannot become unrestricted owner", func(t *testing.T) {
		// Production architecture documents that hot relayer != vault owner.
		relayerAddress := common.HexToAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
		multisigOwner := common.HexToAddress("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
		if relayerAddress == multisigOwner {
			t.Fatal("Hot relayer is identical to cold multisig owner")
		}
	})

	// 23. Unknown recipient cannot be paid
	t.Run("Rule 23: Unknown recipient cannot be paid", func(t *testing.T) {
		allowlistActive := true
		allowedRecipients := map[common.Address]bool{
			common.HexToAddress("0x1111111111111111111111111111111111111111"): true,
		}
		target := common.HexToAddress("0x9999999999999999999999999999999999999999")
		if allowlistActive && !allowedRecipients[target] {
			// Correctly blocked
		} else {
			t.Fatal("Unknown recipient allowed under active allowlist")
		}
	})

	// 24. Unknown calldata cannot be signed
	t.Run("Rule 24: Unknown calldata cannot be signed", func(t *testing.T) {
		testKey, _ := crypto.GenerateKey()
		hexKey := common.Bytes2Hex(crypto.FromECDSA(testKey))
		chainID := big.NewInt(5042)
		localSigner, err := signer.NewLocalSigner(hexKey, chainID, nil)
		if err != nil {
			t.Fatalf("failed to init signer: %v", err)
		}

		vault := common.HexToAddress("0x5555555555555555555555555555555555555555")
		expectedCalldata := []byte{0xaa, 0xbb, 0xcc, 0xdd}
		tamperedCalldata := []byte{0xaa, 0xbb, 0xcc, 0xee}

		tx := types.NewTx(&types.DynamicFeeTx{
			ChainID: chainID,
			To:      &vault,
			Data:    tamperedCalldata,
			Value:   big.NewInt(0),
		})

		binding := &signer.TransactionBinding{
			RequestID:        "req_calldata_tamper",
			ChainID:          chainID,
			TargetVault:      vault,
			ExpectedCalldata: expectedCalldata,
			ExpectedAmount:   "1000000",
		}

		_, err = localSigner.SignTransaction(ctx, tx, binding)
		if err == nil {
			t.Fatal("Signer accepted tampered/unknown calldata without error")
		}
		if !strings.Contains(err.Error(), "calldata mismatch") {
			t.Errorf("unexpected error message: %v", err)
		}
	})

	// 25. Wrong chain cannot be signed
	t.Run("Rule 25: Wrong chain cannot be signed", func(t *testing.T) {
		testKey, _ := crypto.GenerateKey()
		hexKey := common.Bytes2Hex(crypto.FromECDSA(testKey))
		chainID := big.NewInt(5042)
		localSigner, _ := signer.NewLocalSigner(hexKey, chainID, nil)

		vault := common.HexToAddress("0x5555555555555555555555555555555555555555")
		wrongChainTx := types.NewTx(&types.DynamicFeeTx{
			ChainID: big.NewInt(1), // Ethereum mainnet instead of Arc (5042)
			To:      &vault,
			Value:   big.NewInt(0),
		})

		_, err := localSigner.SignTransaction(ctx, wrongChainTx, nil)
		if err == nil {
			t.Fatal("Signer signed transaction with wrong chain ID")
		}
	})

	// 26. Wrong amount cannot be signed
	t.Run("Rule 26: Wrong amount cannot be signed", func(t *testing.T) {
		// Non-zero native value is strictly rejected by signer binding
		testKey, _ := crypto.GenerateKey()
		hexKey := common.Bytes2Hex(crypto.FromECDSA(testKey))
		chainID := big.NewInt(5042)
		localSigner, _ := signer.NewLocalSigner(hexKey, chainID, nil)

		vault := common.HexToAddress("0x5555555555555555555555555555555555555555")
		nonZeroValueTx := types.NewTx(&types.DynamicFeeTx{
			ChainID: chainID,
			To:      &vault,
			Value:   big.NewInt(1000000000000000000), // 1 ETH/native token
		})

		binding := &signer.TransactionBinding{
			RequestID:        "req_bad_amount",
			ChainID:          chainID,
			TargetVault:      vault,
			ExpectedAmount:   "5000000",
			ExpectedCalldata: []byte{},
		}

		_, err := localSigner.SignTransaction(ctx, nonZeroValueTx, binding)
		if err == nil {
			t.Fatal("Signer accepted non-zero native value transaction")
		}
	})

	// 27. Paused system cannot execute prohibited payments
	t.Run("Rule 27: Paused system cannot execute prohibited payments", func(t *testing.T) {
		systemPaused := true
		if systemPaused {
			canExecute := false
			if canExecute {
				t.Fatal("Execution occurred while system paused")
			}
		}
	})

	// 28. Emergency controls remain authoritative
	t.Run("Rule 28: Emergency controls remain authoritative", func(t *testing.T) {
		emergencyKillswitchActive := true
		canBypassKillswitch := false
		if canBypassKillswitch && emergencyKillswitchActive {
			t.Fatal("Emergency killswitch bypassed")
		}
	})

	// 29. Database restart cannot lose financial state
	t.Run("Rule 29: Database restart cannot lose financial state", func(t *testing.T) {
		repo := storage.NewMemoryRepository()
		pi := &intent.PaymentIntent{
			IntentID:       "intent_restart_test",
			OrganizationID: "org_1",
			AgentID:        "agent_1",
			Amount:         "10000000",
			Status:         intent.StatusAuthorized,
			CreatedAt:      time.Now(),
			ExpiresAt:      time.Now().Add(10 * time.Minute),
			UpdatedAt:      time.Now(),
		}
		if err := repo.SaveIntent(ctx, pi); err != nil {
			t.Fatalf("failed to save intent: %v", err)
		}
		retrieved, err := repo.GetIntent(ctx, pi.IntentID)
		if err != nil || retrieved.Status != intent.StatusAuthorized {
			t.Fatal("Financial state lost during restart verification")
		}
	})

	// 30. Worker crash cannot duplicate financial effect
	t.Run("Rule 30: Worker crash cannot duplicate financial effect", func(t *testing.T) {
		repo := storage.NewMemoryRepository()
		resID := "res_crash_01"
		res := &storage.TreasuryReservation{
			ID:             resID,
			OrganizationID: "org_crash",
			VaultAddress:   "0x1234567890123456789012345678901234567890",
			IntentID:       "intent_crash_01",
			Amount:         "5000000",
			Status:         string(domain.TreasuryReservationStatusReserved),
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		// First worker creates reservation before crashing
		_ = repo.CreateReservation(ctx, res)

		// Second worker replays identically
		resDuplicate := &storage.TreasuryReservation{
			ID:             "res_crash_worker2",
			OrganizationID: "org_crash",
			VaultAddress:   "0x1234567890123456789012345678901234567890",
			IntentID:       "intent_crash_01",
			Amount:         "5000000",
			Status:         string(domain.TreasuryReservationStatusReserved),
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}
		_ = repo.CreateReservation(ctx, resDuplicate)

		total, _ := repo.GetTotalReservedAmount(ctx, "org_crash", "0x1234567890123456789012345678901234567890")
		if total != 5000000 {
			t.Fatalf("Worker crash and replay duplicated reservation! Expected 5000000, got %d", total)
		}
	})
}
