package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/handlers"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// mockReadyPolicyClient mocks policy.Client specifically for readiness tests.
type mockReadyPolicyClient struct {
	healthErr error
}

func (m *mockReadyPolicyClient) Authorize(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return domain.AuthorizationDecision{}, nil
}

func (m *mockReadyPolicyClient) Simulate(ctx context.Context, req domain.PaymentRequest) (domain.AuthorizationDecision, error) {
	return domain.AuthorizationDecision{}, nil
}

func (m *mockReadyPolicyClient) CheckHealth(ctx context.Context) error {
	return m.healthErr
}

// mockReadyBlockchainClient implements blockchain.Client for readiness tests.
type mockReadyBlockchainClient struct {
	chainIDErr   error
	chainIDCalls int
}

func (m *mockReadyBlockchainClient) ChainID(ctx context.Context) (*big.Int, error) {
	m.chainIDCalls++
	if m.chainIDErr != nil {
		return nil, m.chainIDErr
	}
	return big.NewInt(5042), nil
}

func (m *mockReadyBlockchainClient) BalanceAt(ctx context.Context, account common.Address) (*big.Int, error) {
	return big.NewInt(0), nil
}

func (m *mockReadyBlockchainClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	return 0, nil
}

func (m *mockReadyBlockchainClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	return big.NewInt(1), nil
}

func (m *mockReadyBlockchainClient) SuggestGasTipCap(ctx context.Context) (*big.Int, error) {
	return big.NewInt(1), nil
}

func (m *mockReadyBlockchainClient) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	return 21000, nil
}

func (m *mockReadyBlockchainClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	return nil
}

func (m *mockReadyBlockchainClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	return nil, nil
}

func (m *mockReadyBlockchainClient) Close() {}

// mockReadyFailingStorage mocks storage.Repository failing on ListServices
type mockReadyFailingStorage struct {
	storage.Repository
}

func (m *mockReadyFailingStorage) ListServices(ctx context.Context) ([]*registry.Service, error) {
	return nil, errors.New("connection refused to postgres")
}

func TestReadyHandler_SafeMode(t *testing.T) {
	t.Run("Safe mode passes with disabled_in_safe_mode without calling RPC", func(t *testing.T) {
		pe := &mockReadyPolicyClient{healthErr: nil}
		repo := storage.NewMemoryRepository()
		bc := &mockReadyBlockchainClient{chainIDErr: errors.New("rpc node unreachable")}

		// Safe mode: enableLiveExecution = false
		handler := handlers.NewReadyHandler(pe, bc, repo, false)

		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200, got: %d (body: %s)", rec.Code, rec.Body.String())
		}

		var resp handlers.ReadyResponse
		if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if resp.Status != "ready" {
			t.Errorf("expected status 'ready', got: %s", resp.Status)
		}
		if resp.Dependencies["arc_rpc"] != "disabled_in_safe_mode" {
			t.Errorf("expected arc_rpc 'disabled_in_safe_mode', got: %s", resp.Dependencies["arc_rpc"])
		}
		if resp.Dependencies["policy_engine"] != "ok" {
			t.Errorf("expected policy_engine 'ok', got: %s", resp.Dependencies["policy_engine"])
		}
		if resp.Dependencies["storage"] != "ok" {
			t.Errorf("expected storage 'ok', got: %s", resp.Dependencies["storage"])
		}
		// Critical: zero RPC calls must be made in safe mode
		if bc.chainIDCalls != 0 {
			t.Errorf("expected 0 RPC calls in safe mode, got: %d", bc.chainIDCalls)
		}
	})

	t.Run("Safe mode fails closed if essential Policy Engine is down", func(t *testing.T) {
		pe := &mockReadyPolicyClient{healthErr: errors.New("connection refused to policy-engine")}
		repo := storage.NewMemoryRepository()
		bc := &mockReadyBlockchainClient{}

		handler := handlers.NewReadyHandler(pe, bc, repo, false)

		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected HTTP 503, got: %d", rec.Code)
		}

		var resp handlers.ReadyResponse
		_ = json.NewDecoder(rec.Body).Decode(&resp)

		if resp.Status != "degraded" {
			t.Errorf("expected status 'degraded', got: %s", resp.Status)
		}
		if resp.Dependencies["policy_engine"] != "unavailable" {
			t.Errorf("expected policy_engine 'unavailable', got: %s", resp.Dependencies["policy_engine"])
		}
	})

	t.Run("Safe mode fails closed if essential Storage is down", func(t *testing.T) {
		pe := &mockReadyPolicyClient{healthErr: nil}
		repo := &mockReadyFailingStorage{}
		bc := &mockReadyBlockchainClient{}

		handler := handlers.NewReadyHandler(pe, bc, repo, false)

		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected HTTP 503, got: %d", rec.Code)
		}

		var resp handlers.ReadyResponse
		_ = json.NewDecoder(rec.Body).Decode(&resp)

		if resp.Status != "degraded" {
			t.Errorf("expected status 'degraded', got: %s", resp.Status)
		}
		if resp.Dependencies["storage"] != "unavailable" {
			t.Errorf("expected storage 'unavailable', got: %s", resp.Dependencies["storage"])
		}
	})
}

func TestReadyHandler_LiveMode(t *testing.T) {
	t.Run("Live mode passes when all dependencies including RPC are healthy", func(t *testing.T) {
		pe := &mockReadyPolicyClient{healthErr: nil}
		repo := storage.NewMemoryRepository()
		bc := &mockReadyBlockchainClient{chainIDErr: nil}

		// Live mode: enableLiveExecution = true
		handler := handlers.NewReadyHandler(pe, bc, repo, true)

		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected HTTP 200, got: %d", rec.Code)
		}

		var resp handlers.ReadyResponse
		_ = json.NewDecoder(rec.Body).Decode(&resp)

		if resp.Status != "ready" {
			t.Errorf("expected status 'ready', got: %s", resp.Status)
		}
		if resp.Dependencies["arc_rpc"] != "ok" {
			t.Errorf("expected arc_rpc 'ok', got: %s", resp.Dependencies["arc_rpc"])
		}
		if bc.chainIDCalls != 1 {
			t.Errorf("expected 1 RPC call in live mode, got: %d", bc.chainIDCalls)
		}
	})

	t.Run("Live mode fails closed when RPC connectivity fails", func(t *testing.T) {
		pe := &mockReadyPolicyClient{healthErr: nil}
		repo := storage.NewMemoryRepository()
		bc := &mockReadyBlockchainClient{chainIDErr: errors.New("timeout connecting to Arc RPC node")}

		handler := handlers.NewReadyHandler(pe, bc, repo, true)

		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected HTTP 503, got: %d", rec.Code)
		}

		var resp handlers.ReadyResponse
		_ = json.NewDecoder(rec.Body).Decode(&resp)

		if resp.Status != "degraded" {
			t.Errorf("expected status 'degraded', got: %s", resp.Status)
		}
		if resp.Dependencies["arc_rpc"] != "unavailable" {
			t.Errorf("expected arc_rpc 'unavailable', got: %s", resp.Dependencies["arc_rpc"])
		}
	})

	t.Run("Live mode fails closed when RPC is unconfigured", func(t *testing.T) {
		pe := &mockReadyPolicyClient{healthErr: nil}
		repo := storage.NewMemoryRepository()

		handler := handlers.NewReadyHandler(pe, nil, repo, true)

		req := httptest.NewRequest(http.MethodGet, "/ready", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected HTTP 503, got: %d", rec.Code)
		}

		var resp handlers.ReadyResponse
		_ = json.NewDecoder(rec.Body).Decode(&resp)

		if resp.Dependencies["arc_rpc"] != "unconfigured" {
			t.Errorf("expected arc_rpc 'unconfigured', got: %s", resp.Dependencies["arc_rpc"])
		}
	})
}

func TestReadyHandler_MethodNotAllowed(t *testing.T) {
	pe := &mockReadyPolicyClient{}
	repo := storage.NewMemoryRepository()
	handler := handlers.NewReadyHandler(pe, nil, repo, false)

	req := httptest.NewRequest(http.MethodPost, "/ready", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected HTTP 405 Method Not Allowed, got: %d", rec.Code)
	}
}
