package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds configuration parameters for the Gateway service.
type Config struct {
	Port                   string
	PolicyEngineURL        string
	PolicyEngineTimeout    time.Duration
	CORSAllowedOrigins     []string
	MaxRequestBodyBytes    int64
	ArcRPCURL              string
	ArcChainID             string
	ArcUSDCAddress         string
	ArcExplorerURL         string
	ExecutorPrivateKey     string
	EnableLiveExecution    bool
	ArcRPCTimeout          time.Duration
	ArcConfirmationTimeout time.Duration

	// Task 6: AI Agent & Storage Configuration
	DatabaseURL            string
	AgentAutoExecution     bool
	PaymentIntentTTLSeconds int
	AIProvider             string
	AIModel                string
	AIAPIKey               string

	// Task 8: Verified AgentVault address
	AgentVaultAddress      string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = os.Getenv("PORT")
	}
	if port == "" {
		port = "8080"
	}

	policyEngineURL := os.Getenv("POLICY_ENGINE_URL")
	if policyEngineURL == "" {
		policyEngineURL = "http://localhost:8081"
	}

	timeoutMs := 2000
	if rawTimeout := os.Getenv("POLICY_ENGINE_TIMEOUT_MS"); rawTimeout != "" {
		if parsed, err := strconv.Atoi(rawTimeout); err == nil && parsed > 0 {
			timeoutMs = parsed
		}
	}

	var corsOrigins []string
	if rawCORS := os.Getenv("CORS_ALLOWED_ORIGINS"); rawCORS != "" {
		for _, o := range strings.Split(rawCORS, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				corsOrigins = append(corsOrigins, trimmed)
			}
		}
	} else {
		corsOrigins = []string{"http://localhost:3000"}
	}

	maxBodyBytes := int64(1048576) // 1MB default
	if rawMax := os.Getenv("MAX_REQUEST_BODY_BYTES"); rawMax != "" {
		if parsed, err := strconv.ParseInt(rawMax, 10, 64); err == nil && parsed > 0 {
			maxBodyBytes = parsed
		}
	}

	arcRPCURL := os.Getenv("ARC_RPC_URL")
	if arcRPCURL == "" {
		arcRPCURL = "https://rpc.mainnet.arc.io"
	}

	arcChainID := os.Getenv("ARC_CHAIN_ID")
	if arcChainID == "" {
		arcChainID = "5042"
	}

	arcUSDCAddress := os.Getenv("ARC_USDC_ADDRESS")
	if arcUSDCAddress == "" {
		arcUSDCAddress = "0x3600000000000000000000000000000000000000"
	}

	arcExplorerURL := os.Getenv("ARC_EXPLORER_URL")
	if arcExplorerURL == "" {
		arcExplorerURL = "https://explorer.arc.io"
	}

	enableLiveExecution := false
	if rawLive := os.Getenv("ENABLE_LIVE_EXECUTION"); strings.EqualFold(rawLive, "true") || rawLive == "1" {
		enableLiveExecution = true
	}

	rpcTimeoutMs := 5000
	if rawRPCTimeout := os.Getenv("ARC_RPC_TIMEOUT_MS"); rawRPCTimeout != "" {
		if parsed, err := strconv.Atoi(rawRPCTimeout); err == nil && parsed > 0 {
			rpcTimeoutMs = parsed
		}
	}

	confirmationTimeoutMs := 60000
	if rawConfTimeout := os.Getenv("ARC_CONFIRMATION_TIMEOUT_MS"); rawConfTimeout != "" {
		if parsed, err := strconv.Atoi(rawConfTimeout); err == nil && parsed > 0 {
			confirmationTimeoutMs = parsed
		}
	}

	agentAutoExecution := false
	if rawAuto := os.Getenv("AGENT_AUTO_EXECUTION"); strings.EqualFold(rawAuto, "true") || rawAuto == "1" {
		agentAutoExecution = true
	}

	ttlSeconds := 300
	if rawTTL := os.Getenv("PAYMENT_INTENT_TTL_SECONDS"); rawTTL != "" {
		if parsed, err := strconv.Atoi(rawTTL); err == nil && parsed > 0 {
			ttlSeconds = parsed
		}
	}

	aiProvider := os.Getenv("AI_PROVIDER")
	if aiProvider == "" {
		aiProvider = "mock"
	}

	return &Config{
		Port:                   port,
		PolicyEngineURL:        policyEngineURL,
		PolicyEngineTimeout:    time.Duration(timeoutMs) * time.Millisecond,
		CORSAllowedOrigins:     corsOrigins,
		MaxRequestBodyBytes:    maxBodyBytes,
		ArcRPCURL:              arcRPCURL,
		ArcChainID:             arcChainID,
		ArcUSDCAddress:         arcUSDCAddress,
		ArcExplorerURL:         arcExplorerURL,
		ExecutorPrivateKey:     os.Getenv("EXECUTOR_PRIVATE_KEY"),
		EnableLiveExecution:    enableLiveExecution,
		ArcRPCTimeout:          time.Duration(rpcTimeoutMs) * time.Millisecond,
		ArcConfirmationTimeout: time.Duration(confirmationTimeoutMs) * time.Millisecond,

		DatabaseURL:            os.Getenv("DATABASE_URL"),
		AgentAutoExecution:     agentAutoExecution,
		PaymentIntentTTLSeconds: ttlSeconds,
		AIProvider:             aiProvider,
		AIModel:                os.Getenv("AI_MODEL"),
		AIAPIKey:               os.Getenv("AI_API_KEY"),
		AgentVaultAddress:      os.Getenv("AGENTVAULT_ADDRESS"),
	}
}

// ValidateLiveExecutionRequirements verifies all critical mainnet safety preconditions.
// Returns an error if any safety check fails, preventing live execution from starting.
// Note: This method NEVER logs or echoes the private key.
func (c *Config) ValidateLiveExecutionRequirements() error {
	if !c.EnableLiveExecution {
		return nil
	}

	if strings.TrimSpace(c.ArcRPCURL) == "" {
		return &SafetyCheckError{Reason: "ARC_RPC_URL must be specified when ENABLE_LIVE_EXECUTION is true"}
	}

	if c.ArcChainID != "5042" {
		return &SafetyCheckError{Reason: "ARC_CHAIN_ID must be '5042' for Arc Mainnet"}
	}

	trimmedUSDC := strings.TrimSpace(c.ArcUSDCAddress)
	if len(trimmedUSDC) != 42 || !strings.HasPrefix(trimmedUSDC, "0x") {
		return &SafetyCheckError{Reason: "ARC_USDC_ADDRESS must be a valid 42-character 0x hex address"}
	}

	trimmedKey := strings.TrimSpace(strings.TrimPrefix(c.ExecutorPrivateKey, "0x"))
	if trimmedKey == "" {
		return &SafetyCheckError{Reason: "EXECUTOR_PRIVATE_KEY must be provided when ENABLE_LIVE_EXECUTION is true"}
	}
	if len(trimmedKey) != 64 {
		return &SafetyCheckError{Reason: "EXECUTOR_PRIVATE_KEY must be a 64-character hex string (32 bytes)"}
	}

	if c.AgentVaultAddress != "" {
		trimmedVault := strings.TrimSpace(c.AgentVaultAddress)
		if len(trimmedVault) != 42 || !strings.HasPrefix(trimmedVault, "0x") {
			return &SafetyCheckError{Reason: "AGENTVAULT_ADDRESS must be a valid 42-character 0x hex address"}
		}
	}

	return nil
}

// SafetyCheckError represents a configuration violation that prevents safe live execution.
type SafetyCheckError struct {
	Reason string
}

func (e *SafetyCheckError) Error() string {
	return "mainnet safety check failed: " + e.Reason
}

