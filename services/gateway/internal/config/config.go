package config

import (
	"os"
)

// Config holds configuration parameters for the Gateway service.
type Config struct {
	Port            string
	PolicyEngineURL string
	ArcRPCURL       string
	ArcChainID      string
	ArcUSDCAddress  string
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

	return &Config{
		Port:            port,
		PolicyEngineURL: policyEngineURL,
		ArcRPCURL:       os.Getenv("ARC_RPC_URL"),
		ArcChainID:      os.Getenv("ARC_CHAIN_ID"),
		ArcUSDCAddress:  os.Getenv("ARC_USDC_ADDRESS"),
	}
}
