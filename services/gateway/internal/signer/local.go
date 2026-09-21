package signer

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

// LocalSigner signs transactions using an in-memory ECDSA private key.
// Used for local development, integration testing, and single-relayer setups.
type LocalSigner struct {
	privateKey *ecdsa.PrivateKey
	address    common.Address
	chainID    *big.Int
	recorder   AuditRecorder
}

// NewLocalSigner initializes a LocalSigner with rigorous validation.
// Note: hexKey is parsed and stored only in private fields. It is never logged or exposed.
func NewLocalSigner(hexKey string, chainID *big.Int, recorder AuditRecorder) (*LocalSigner, error) {
	if chainID == nil || chainID.Sign() <= 0 {
		return nil, ErrInvalidChainID
	}

	trimmed := strings.TrimSpace(strings.TrimPrefix(hexKey, "0x"))
	if trimmed == "" {
		return nil, ErrEmptyPrivateKey
	}
	if len(trimmed) != 64 {
		return nil, ErrInvalidPrivateKeyLength
	}

	key, err := crypto.HexToECDSA(trimmed)
	if err != nil {
		return nil, fmt.Errorf("failed to parse ECDSA private key: %w", err)
	}

	address := crypto.PubkeyToAddress(key.PublicKey)
	return &LocalSigner{
		privateKey: key,
		address:    address,
		chainID:    new(big.Int).Set(chainID),
		recorder:   recorder,
	}, nil
}

// Address returns the public Ethereum address derived from the private key.
func (s *LocalSigner) Address() common.Address {
	return s.address
}

// ChainID returns the expected chain ID.
func (s *LocalSigner) ChainID() *big.Int {
	return new(big.Int).Set(s.chainID)
}

// Backend returns the string identifier "local".
func (s *LocalSigner) Backend() string {
	return "local"
}

// String implements fmt.Stringer to ensure private keys are NEVER revealed via reflection, prints, or logs.
func (s *LocalSigner) String() string {
	return fmt.Sprintf("LocalSigner{address: %s, chain_id: %s, backend: local}", s.address.Hex(), s.chainID.String())
}

// SignTransaction signs an EIP-1559 transaction after validating transaction bindings.
func (s *LocalSigner) SignTransaction(ctx context.Context, tx *types.Transaction, binding *TransactionBinding) (*types.Transaction, error) {
	now := time.Now()

	// 1. Transaction validity checks
	if tx == nil {
		s.recordAudit(ctx, binding, nil, false, ErrNilTransaction.Error(), now)
		return nil, ErrNilTransaction
	}

	// 2. Chain ID validation
	if tx.ChainId().Cmp(s.chainID) != 0 {
		err := fmt.Errorf("%w: transaction has chain ID %s, signer configured for %s",
			ErrInvalidChainID, tx.ChainId().String(), s.chainID.String())
		s.recordAudit(ctx, binding, tx, false, err.Error(), now)
		return nil, err
	}

	// 3. Transaction Binding Verification (Defense-in-depth against mutation)
	if binding != nil {
		if err := s.verifyBinding(tx, binding); err != nil {
			s.recordAudit(ctx, binding, tx, false, err.Error(), now)
			return nil, err
		}
	}

	// 4. London/EIP-1559 Signer
	londonSigner := types.NewLondonSigner(s.chainID)
	signedTx, err := types.SignTx(tx, londonSigner, s.privateKey)
	if err != nil {
		signingErr := fmt.Errorf("%w: %v", ErrSigningFailed, err)
		s.recordAudit(ctx, binding, tx, false, signingErr.Error(), now)
		return nil, signingErr
	}

	// 5. Verify cryptographic signature recovery matches expected address
	sender, err := types.Sender(londonSigner, signedTx)
	if err != nil || sender != s.address {
		errMismatch := fmt.Errorf("%w: recovered %s, expected %s", ErrSignerAddressMismatch, sender.Hex(), s.address.Hex())
		s.recordAudit(ctx, binding, tx, false, errMismatch.Error(), now)
		return nil, errMismatch
	}

	// 6. Record successful signing audit event
	s.recordAudit(ctx, binding, signedTx, true, "", now)

	return signedTx, nil
}

func (s *LocalSigner) verifyBinding(tx *types.Transaction, b *TransactionBinding) error {
	// Chain ID match
	if b.ChainID != nil && tx.ChainId().Cmp(b.ChainID) != 0 {
		return fmt.Errorf("%w: binding chain ID %s != tx chain ID %s",
			ErrTransactionBindingMismatch, b.ChainID.String(), tx.ChainId().String())
	}

	// Target Vault match
	if tx.To() == nil || *tx.To() != b.TargetVault {
		expected := b.TargetVault.Hex()
		got := "nil"
		if tx.To() != nil {
			got = tx.To().Hex()
		}
		return fmt.Errorf("%w: destination address mismatch (expected %s, got %s)",
			ErrTransactionBindingMismatch, expected, got)
	}

	// Value must be 0 for AgentVault payments (funds are transferred via USDC ERC-20, not native gas currency)
	if tx.Value() != nil && tx.Value().Sign() != 0 {
		return fmt.Errorf("%w: unexpected native token value %s in transaction (expected 0)",
			ErrTransactionBindingMismatch, tx.Value().String())
	}

	// Calldata hash match (ensures recipient, amount, purpose was not modified post-gate)
	if len(b.ExpectedCalldata) > 0 && !bytes.Equal(tx.Data(), b.ExpectedCalldata) {
		return fmt.Errorf("%w: transaction calldata mismatch (calldata was mutated post-authorization)",
			ErrTransactionBindingMismatch)
	}

	return nil
}

func (s *LocalSigner) recordAudit(ctx context.Context, b *TransactionBinding, tx *types.Transaction, success bool, errMsg string, t time.Time) {
	if s.recorder == nil {
		return
	}

	reqID := "unknown"
	dest := common.Address{}
	amount := ""
	var calldata []byte

	if b != nil {
		reqID = b.RequestID
		dest = b.TargetVault
		amount = b.ExpectedAmount
		calldata = b.ExpectedCalldata
	} else if tx != nil {
		if tx.To() != nil {
			dest = *tx.To()
		}
		calldata = tx.Data()
	}

	event := &SigningAuditEvent{
		ID:                 generateAuditID("sig_evt_"),
		RequestID:          reqID,
		SignerBackend:      s.Backend(),
		SignerAddress:      s.address,
		ChainID:            s.chainID,
		DestinationVault:   dest,
		CalldataSHA256Hash: HashCalldata(calldata),
		Amount:             amount,
		Success:            success,
		ErrorMessage:       errMsg,
		Timestamp:          t,
	}

	_ = s.recorder.RecordSigningEvent(ctx, event)
}

func generateAuditID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return prefix + hex.EncodeToString(b)
}
