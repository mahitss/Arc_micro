package network

import (
	"testing"
	"time"
)

func TestAgentManifestValidator_ValidManifest(t *testing.T) {
	validator := NewAgentManifestValidator(false)

	valid := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_researcher_01",
		OrganizationID:  "org_test_123",
		Name:            "Market Intelligence Agent",
		Description:     "Specialized research agent",
		Version:         "1.0.0",
		Capabilities:    []string{"research@1.0", "web_search@1.0"},
		Pricing: []ManifestPricing{
			{
				Capability: "research@1.0",
				Model:      "FIXED",
				BasePrice:  "250000",
				Currency:   "USDC",
			},
		},
		Settlement: []string{"ARC_USDC"},
		Endpoints: ManifestEndpoints{
			TaskURL:   "https://agent.example.com/tasks",
			HealthURL: "https://agent.example.com/health",
		},
		CreatedAt: time.Now(),
	}

	err := validator.ValidateManifest(valid)
	if err != nil {
		t.Fatalf("expected valid manifest to pass, got: %v", err)
	}
}

func TestAgentManifestValidator_Rejections(t *testing.T) {
	validator := NewAgentManifestValidator(false)

	// 1. Unsupported Protocol Version
	m1 := &AgentManifest{
		ProtocolVersion: "unsupported.v2",
		AgentID:         "agent_01",
		Name:            "Agent",
		Capabilities:    []string{"research@1.0"},
		Pricing: []ManifestPricing{
			{Capability: "research@1.0", BasePrice: "1000", Currency: "USDC"},
		},
		Settlement: []string{"ARC_USDC"},
		Endpoints:  ManifestEndpoints{TaskURL: "https://example.com/task"},
	}
	if err := validator.ValidateManifest(m1); err == nil {
		t.Errorf("expected error for unsupported protocol version")
	}

	// 2. Dangerous SSRF Endpoint (169.254.169.254)
	m2 := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_01",
		Name:            "Agent",
		Capabilities:    []string{"research@1.0"},
		Pricing: []ManifestPricing{
			{Capability: "research@1.0", BasePrice: "1000", Currency: "USDC"},
		},
		Settlement: []string{"ARC_USDC"},
		Endpoints:  ManifestEndpoints{TaskURL: "https://169.254.169.254/metadata"},
	}
	if err := validator.ValidateManifest(m2); err == nil {
		t.Errorf("expected error for SSRF cloud metadata endpoint")
	}

	// 3. Localhost in Production
	m3 := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_01",
		Name:            "Agent",
		Capabilities:    []string{"research@1.0"},
		Pricing: []ManifestPricing{
			{Capability: "research@1.0", BasePrice: "1000", Currency: "USDC"},
		},
		Settlement: []string{"ARC_USDC"},
		Endpoints:  ManifestEndpoints{TaskURL: "https://localhost:8080/task"},
	}
	if err := validator.ValidateManifest(m3); err == nil {
		t.Errorf("expected error for localhost endpoint in production mode")
	}

	// 4. Forbidden Authority Field
	m4 := &AgentManifest{
		ProtocolVersion: ProtocolVersionV1,
		AgentID:         "agent_01",
		Name:            "Agent",
		Capabilities:    []string{"research@1.0"},
		Pricing: []ManifestPricing{
			{Capability: "research@1.0", BasePrice: "1000", Currency: "USDC"},
		},
		Settlement: []string{"ARC_USDC"},
		Endpoints:  ManifestEndpoints{TaskURL: "https://example.com/task"},
		TrustMetadata: map[string]string{
			"private_key": "0x1234567890abcdef",
		},
	}
	if err := validator.ValidateManifest(m4); err == nil {
		t.Errorf("expected error for forbidden authority field 'private_key'")
	}
}

func TestCapabilityRegistry(t *testing.T) {
	reg := NewCapabilityRegistry()

	c, err := reg.GetCapability("research@1.0")
	if err != nil {
		t.Fatalf("expected to find research@1.0, got: %v", err)
	}
	if c.Category != "research" {
		t.Errorf("expected category 'research', got '%s'", c.Category)
	}

	// Test fallback if version omitted
	c2, err := reg.GetCapability("web_search")
	if err != nil {
		t.Fatalf("expected fallback lookup for web_search, got: %v", err)
	}
	if c2.CapabilityID != "web_search@1.0" {
		t.Errorf("expected capability ID 'web_search@1.0', got '%s'", c2.CapabilityID)
	}

	// Register custom capability
	custom := &StructuredCapability{
		CapabilityID: "custom.plugin@2.1",
		Name:         "Custom Analysis Plugin",
		Category:     "analytics",
		PricingModel: "FIXED",
	}
	if err := reg.RegisterCapability(custom); err != nil {
		t.Fatalf("failed to register custom capability: %v", err)
	}

	// Duplicate registration error
	if err := reg.RegisterCapability(custom); err == nil {
		t.Errorf("expected duplicate registration error")
	}
}
