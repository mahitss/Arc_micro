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
	}
}
