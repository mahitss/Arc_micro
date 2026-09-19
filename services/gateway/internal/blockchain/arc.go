package blockchain

import (
	"crypto/sha256"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

// DefaultArcChainID is the official chain ID for Arc mainnet.
const DefaultArcChainID = "5042"

// ValidateChainID verifies that the RPC node's actual chain ID matches the expected configured chain ID.
func ValidateChainID(configuredChainID string, actualChainID *big.Int) error {
	if actualChainID == nil {
		return &ConfigurationError{Reason: "actual chain ID is nil"}
	}

	expected, ok := new(big.Int).SetString(configuredChainID, 10)
	if !ok {
		return &ConfigurationError{Reason: fmt.Sprintf("invalid configured chain ID: %s", configuredChainID)}
	}

	if expected.Cmp(actualChainID) != 0 {
		return &NetworkMismatchError{
			Expected: expected.String(),
			Actual:   actualChainID.String(),
		}
	}
	return nil
}

// ValidateAddress checks whether the given string is a valid 42-character 0x hex Ethereum address.
func ValidateAddress(field, addrStr string) (common.Address, error) {
	trimmed := strings.TrimSpace(addrStr)
	if !common.IsHexAddress(trimmed) || len(trimmed) != 42 || !strings.HasPrefix(trimmed, "0x") {
		return common.Address{}, &ValidationError{
			Field:  field,
			Reason: fmt.Sprintf("invalid address format: expected 42-character hex address starting with 0x, got '%s'", addrStr),
		}
	}
	return common.HexToAddress(trimmed), nil
}

// BuildExplorerTxURL constructs a block explorer URL for a given transaction hash.
func BuildExplorerTxURL(baseURL, txHash string) string {
	trimmed := strings.TrimRight(baseURL, "/")
	if trimmed == "" {
		return ""
	}
	return fmt.Sprintf("%s/tx/%s", trimmed, txHash)
}

// PurposeToBytes32 converts a purpose string into a deterministic bytes32 identifier.
// If the purpose is already a 66-character hex string ("0x" + 64 hex chars), it decodes it directly.
// Otherwise, it computes sha256(purpose) to produce a fixed 32-byte hash.
func PurposeToBytes32(purpose string) [32]byte {
	var res [32]byte
	if strings.HasPrefix(purpose, "0x") && len(purpose) == 66 {
		b := common.FromHex(purpose)
		if len(b) == 32 {
			copy(res[:], b)
			return res
		}
	}
	hash := sha256.Sum256([]byte(purpose))
	return hash
}
