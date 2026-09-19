package blockchain_test

import (
	"math/big"
	"testing"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/blockchain"
	"github.com/ethereum/go-ethereum/common"
)

func TestValidateChainID(t *testing.T) {
	// Matching chain ID 5042
	actual := big.NewInt(5042)
	if err := blockchain.ValidateChainID("5042", actual); err != nil {
		t.Fatalf("expected valid chain ID, got: %v", err)
	}

	// Mismatched chain ID
	mismatch := big.NewInt(1)
	err := blockchain.ValidateChainID("5042", mismatch)
	if err == nil {
		t.Fatal("expected NetworkMismatchError, got nil")
	}

	// Invalid configured chain ID
	err = blockchain.ValidateChainID("not_a_number", actual)
	if err == nil {
		t.Fatal("expected ConfigurationError for non-numeric chain ID, got nil")
	}

	// Nil actual chain ID
	err = blockchain.ValidateChainID("5042", nil)
	if err == nil {
		t.Fatal("expected ConfigurationError for nil actual chain ID, got nil")
	}
}

func TestValidateAddress(t *testing.T) {
	validHex := "0x1111111111111111111111111111111111111111"
	addr, err := blockchain.ValidateAddress("recipient", validHex)
	if err != nil {
		t.Fatalf("expected valid address, got: %v", err)
	}
	if addr != common.HexToAddress(validHex) {
		t.Errorf("address mismatch")
	}

	invalidCases := []struct {
		name string
		addr string
	}{
		{"missing 0x prefix", "1111111111111111111111111111111111111111"},
		{"too short", "0x1234"},
		{"too long", "0x111111111111111111111111111111111111111122"},
		{"non-hex characters", "0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"},
		{"empty string", ""},
	}

	for _, tc := range invalidCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := blockchain.ValidateAddress("test", tc.addr)
			if err == nil {
				t.Errorf("[%s] expected validation error, got nil", tc.name)
			}
		})
	}
}

func TestBuildExplorerTxURL(t *testing.T) {
	txHash := "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
	expected := "https://explorer.arc.io/tx/" + txHash

	url1 := blockchain.BuildExplorerTxURL("https://explorer.arc.io", txHash)
	if url1 != expected {
		t.Errorf("expected %s, got %s", expected, url1)
	}

	// Trailing slash handled cleanly
	url2 := blockchain.BuildExplorerTxURL("https://explorer.arc.io/", txHash)
	if url2 != expected {
		t.Errorf("expected %s, got %s", expected, url2)
	}

	// Empty base URL returns empty
	url3 := blockchain.BuildExplorerTxURL("", txHash)
	if url3 != "" {
		t.Errorf("expected empty string, got %s", url3)
	}
}

func TestPurposeToBytes32(t *testing.T) {
	// String purpose
	p1 := blockchain.PurposeToBytes32("api_usage")
	if p1 == [32]byte{} {
		t.Errorf("expected non-zero bytes32 hash")
	}

	// Deterministic hash: same string yields same bytes
	p2 := blockchain.PurposeToBytes32("api_usage")
	if p1 != p2 {
		t.Errorf("expected deterministic hash")
	}

	// Direct 66-character hex string
	hexStr := "0x" + "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
	pHex := blockchain.PurposeToBytes32(hexStr)
	if pHex[0] != 0x01 || pHex[31] != 0x20 {
		t.Errorf("hex decoding failed: got %x", pHex)
	}
}

func TestPackExecutePayment(t *testing.T) {
	recipient := common.HexToAddress("0x1111111111111111111111111111111111111111")
	amount := big.NewInt(180000)
	purpose := blockchain.PurposeToBytes32("test")

	data, err := blockchain.PackExecutePayment(recipient, amount, purpose)
	if err != nil {
		t.Fatalf("unexpected error packing calldata: %v", err)
	}
	// 4 bytes selector + 3 * 32 bytes arguments = 100 bytes
	if len(data) != 100 {
		t.Fatalf("expected 100 bytes calldata, got %d", len(data))
	}

	// Zero or negative amount should fail
	_, errZero := blockchain.PackExecutePayment(recipient, big.NewInt(0), purpose)
	if errZero == nil {
		t.Error("expected error for zero amount")
	}

	_, errNil := blockchain.PackExecutePayment(recipient, nil, purpose)
	if errNil == nil {
		t.Error("expected error for nil amount")
	}
}
