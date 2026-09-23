package network

import (
	"errors"
	"fmt"
	"strings"
	"sync"
)

var (
	ErrCapabilityAlreadyExists = errors.New("capability already registered with this version")
	ErrCapabilityNotFound      = errors.New("capability not found")
)

// CapabilityRegistry manages structured, versioned capabilities across the Open Agent Network.
type CapabilityRegistry struct {
	mu           sync.RWMutex
	capabilities map[string]*StructuredCapability // key: capability_id (e.g. "security.audit@1.2")
}

// NewCapabilityRegistry creates and initializes a CapabilityRegistry seeded with canonical capabilities.
func NewCapabilityRegistry() *CapabilityRegistry {
	r := &CapabilityRegistry{
		capabilities: make(map[string]*StructuredCapability),
	}
	r.seedCanonicalCapabilities()
	return r
}

func (r *CapabilityRegistry) seedCanonicalCapabilities() {
	canonicals := []StructuredCapability{
		{
			CapabilityID:            "research@1.0",
			Name:                    "Deep Web & Market Research",
			Version:                 "1.0",
			Category:                "research",
			PricingModel:            "FIXED",
			ExpectedLatencyMs:       1500,
			VerificationRequirement: "SCHEMA",
		},
		{
			CapabilityID:            "web_search@1.0",
			Name:                    "Realtime Web Search & Indexing",
			Version:                 "1.0",
			Category:                "web_search",
			PricingModel:            "FIXED",
			ExpectedLatencyMs:       800,
			VerificationRequirement: "SCHEMA",
		},
		{
			CapabilityID:            "data_analysis@1.0",
			Name:                    "Tabular & Statistical Data Analysis",
			Version:                 "1.0",
			Category:                "data_analysis",
			PricingModel:            "VARIABLE",
			ExpectedLatencyMs:       2000,
			VerificationRequirement: "CHECKSUM",
		},
		{
			CapabilityID:            "coding@1.0",
			Name:                    "Automated Code Generation & Refactoring",
			Version:                 "1.0",
			Category:                "coding",
			PricingModel:            "VARIABLE",
			ExpectedLatencyMs:       3000,
			VerificationRequirement: "SCHEMA",
		},
		{
			CapabilityID:            "security.audit@1.0",
			Name:                    "Smart Contract & Vulnerability Audit",
			Version:                 "1.0",
			Category:                "security_audit",
			PricingModel:            "QUOTE_REQUIRED",
			ExpectedLatencyMs:       5000,
			VerificationRequirement: "MULTI_AGENT",
		},
		{
			CapabilityID:            "financial_analysis@1.0",
			Name:                    "Corporate Financial & Risk Modeling",
			Version:                 "1.0",
			Category:                "financial_analysis",
			PricingModel:            "QUOTE_REQUIRED",
			ExpectedLatencyMs:       2500,
			VerificationRequirement: "CHECKSUM",
		},
		{
			CapabilityID:            "market_analysis@1.0",
			Name:                    "Competitive Intelligence & Landscape",
			Version:                 "1.0",
			Category:                "market_analysis",
			PricingModel:            "FIXED",
			ExpectedLatencyMs:       1800,
			VerificationRequirement: "SCHEMA",
		},
		{
			CapabilityID:            "document_processing@1.0",
			Name:                    "OCR, Parsing & Structured Extraction",
			Version:                 "1.0",
			Category:                "document_processing",
			PricingModel:            "FIXED",
			ExpectedLatencyMs:       1200,
			VerificationRequirement: "CHECKSUM",
		},
		{
			CapabilityID:            "simulation@1.0",
			Name:                    "Economic & Scenario Monte Carlo Simulation",
			Version:                 "1.0",
			Category:                "simulation",
			PricingModel:            "FIXED",
			ExpectedLatencyMs:       1000,
			VerificationRequirement: "CHECKSUM",
		},
	}

	for i := range canonicals {
		c := canonicals[i]
		r.capabilities[c.CapabilityID] = &c
	}
}

// RegisterCapability stores a new versioned capability in the registry.
func (r *CapabilityRegistry) RegisterCapability(c *StructuredCapability) error {
	if c == nil {
		return errors.New("capability cannot be nil")
	}
	name, version, err := ParseCapabilityVersion(c.CapabilityID)
	if err != nil {
		return err
	}
	if err := ValidateCapabilityName(name); err != nil {
		return err
	}

	c.CapabilityID = FormatCapabilityVersion(name, version)
	c.Version = version

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.capabilities[c.CapabilityID]; exists {
		return fmt.Errorf("%w: %s", ErrCapabilityAlreadyExists, c.CapabilityID)
	}

	r.capabilities[c.CapabilityID] = c
	return nil
}

// GetCapability looks up a capability by exact ID (e.g. "security.audit@1.0").
func (r *CapabilityRegistry) GetCapability(id string) (*StructuredCapability, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.capabilities[strings.TrimSpace(id)]
	if !ok {
		// Try fallback if version omitted: look for default @1.0
		fallbackID := FormatCapabilityVersion(id, "1.0")
		c, ok = r.capabilities[fallbackID]
		if !ok {
			return nil, fmt.Errorf("%w: %s", ErrCapabilityNotFound, id)
		}
	}
	return c, nil
}

// ListCapabilities returns all registered capabilities matching an optional category filter.
func (r *CapabilityRegistry) ListCapabilities(category string) []*StructuredCapability {
	r.mu.RLock()
	defer r.mu.RUnlock()

	results := make([]*StructuredCapability, 0, len(r.capabilities))
	catLower := strings.ToLower(strings.TrimSpace(category))

	for _, c := range r.capabilities {
		if catLower == "" || strings.ToLower(c.Category) == catLower || strings.Contains(strings.ToLower(c.CapabilityID), catLower) {
			results = append(results, c)
		}
	}
	return results
}
