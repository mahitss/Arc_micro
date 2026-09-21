package config

import (
	"strings"
	"testing"
)

func TestValidateLiveExecutionRequirements(t *testing.T) {
	validConfig := func() *Config {
		return &Config{
			EnableLiveExecution: true,
			ArcRPCURL:           "https://rpc.mainnet.arc.io",
			ArcChainID:          "5042",
			ArcUSDCAddress:      "0x3600000000000000000000000000000000000000",
			ExecutorPrivateKey:  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			AgentVaultAddress:   "0x1111111111111111111111111111111111111111",
		}
	}

	t.Run("Valid configuration succeeds", func(t *testing.T) {
		cfg := validConfig()
		if err := cfg.ValidateLiveExecutionRequirements(); err != nil {
			t.Fatalf("expected valid config to pass, got: %v", err)
		}
	})

	t.Run("Execution disabled passes regardless of parameters", func(t *testing.T) {
		cfg := &Config{
			EnableLiveExecution: false,
		}
		if err := cfg.ValidateLiveExecutionRequirements(); err != nil {
			t.Fatalf("expected disabled execution to pass, got: %v", err)
		}
	})

	t.Run("Rejects missing RPC URL", func(t *testing.T) {
		cfg := validConfig()
		cfg.ArcRPCURL = ""
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "ARC_RPC_URL must be specified") {
			t.Fatalf("expected error for missing RPC URL, got: %v", err)
		}
	})

	t.Run("Rejects wrong chain ID", func(t *testing.T) {
		cfg := validConfig()
		cfg.ArcChainID = "1"
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "ARC_CHAIN_ID must be '5042'") {
			t.Fatalf("expected error for wrong chain ID, got: %v", err)
		}
	})

	t.Run("Rejects invalid USDC address", func(t *testing.T) {
		cfg := validConfig()
		cfg.ArcUSDCAddress = "0xinvalid"
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "ARC_USDC_ADDRESS must be a valid 42-character") {
			t.Fatalf("expected error for invalid USDC address, got: %v", err)
		}
	})

	t.Run("Rejects missing executor private key", func(t *testing.T) {
		cfg := validConfig()
		cfg.ExecutorPrivateKey = ""
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "EXECUTOR_PRIVATE_KEY must be provided") {
			t.Fatalf("expected error for missing executor private key, got: %v", err)
		}
	})

	t.Run("Rejects invalid executor private key length", func(t *testing.T) {
		cfg := validConfig()
		cfg.ExecutorPrivateKey = "12345"
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "EXECUTOR_PRIVATE_KEY must be a 64-character") {
			t.Fatalf("expected error for invalid executor private key length, got: %v", err)
		}
	})

	t.Run("Rejects missing AgentVault address", func(t *testing.T) {
		cfg := validConfig()
		cfg.AgentVaultAddress = ""
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "AGENTVAULT_ADDRESS must be specified") {
			t.Fatalf("expected error for missing AgentVault address, got: %v", err)
		}
	})

	t.Run("Rejects invalid AgentVault address format", func(t *testing.T) {
		cfg := validConfig()
		cfg.AgentVaultAddress = "0xshort"
		err := cfg.ValidateLiveExecutionRequirements()
		if err == nil || !strings.Contains(err.Error(), "AGENTVAULT_ADDRESS must be a valid 42-character") {
			t.Fatalf("expected error for invalid AgentVault address, got: %v", err)
		}
	})
}
