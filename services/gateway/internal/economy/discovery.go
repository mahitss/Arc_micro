package economy

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/registry"
)

var (
	ErrNoEligibleProviders  = errors.New("no eligible providers found for capability")
	ErrQuoteIncomplete      = errors.New("candidate quote is incomplete: missing mandatory fields")
	ErrQuoteExpiredGate     = errors.New("candidate quote is expired")
	ErrQuoteCurrencyGate    = errors.New("candidate quote currency mismatch")
	ErrQuoteOverBudgetGate  = errors.New("candidate quote exceeds authorized step budget")
	ErrMalformedPriceGate   = errors.New("candidate quote has malformed non-positive price")
)

// DiscoveredProvider represents a candidate service provider discoverable in the AgentPay economy.
type DiscoveredProvider struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	Category           string   `json:"category"`
	Capabilities       []string `json:"capabilities"`
	Recipient          string   `json:"recipient"`
	Asset              string   `json:"asset"`
	PricingModel       string   `json:"pricing_model"`
	FixedPrice         string   `json:"fixed_price,omitempty"`
	MaxPrice           string   `json:"max_price,omitempty"`
	TrustStatus        string   `json:"trust_status"`
	SuccessRateBps     int64    `json:"success_rate_bps"`
	AverageLatencyMs   int64    `json:"average_latency_ms"`
	IsMockProvider     bool     `json:"is_mock_provider"`
	Source             string   `json:"source"` // "REAL_REGISTRY" or "MOCK"
	CapabilityEvidence string   `json:"capability_evidence,omitempty"`
}

// ProviderDiscovery defines the discovery and quotation interface for autonomous services.
type ProviderDiscovery interface {
	DiscoverProviders(ctx context.Context, capability string) ([]*DiscoveredProvider, error)
	RequestQuote(ctx context.Context, providerID, capability, maxBudget, currency string) (*Quote, error)
	ValidateQuote(q *Quote, maxBudget, currency string) error
}

// RegistryProviderDiscovery implements ProviderDiscovery using the AgentPay service registry and deterministic mock fallbacks.
type RegistryProviderDiscovery struct {
	reg *registry.Registry
}

// NewRegistryProviderDiscovery constructs a new discovery adapter.
func NewRegistryProviderDiscovery(reg *registry.Registry) *RegistryProviderDiscovery {
	return &RegistryProviderDiscovery{reg: reg}
}

// DiscoverProviders locates services providing the requested capability.
// Real registry services are returned with Source="REAL_REGISTRY" and IsMockProvider=false.
// If no real registry services exist, deterministic mock providers are returned explicitly labeled as MOCK.
func (d *RegistryProviderDiscovery) DiscoverProviders(ctx context.Context, capability string) ([]*DiscoveredProvider, error) {
	capClean := strings.ToLower(strings.TrimSpace(capability))
	if capClean == "" {
		return nil, errors.New("empty capability requested for discovery")
	}

	var results []*DiscoveredProvider

	if d.reg != nil {
		services := d.reg.ListByCapability(capClean)
		for _, s := range services {
			if s == nil || !s.Enabled {
				continue
			}
			results = append(results, &DiscoveredProvider{
				ID:                 s.ID,
				Name:               s.Name,
				Category:           s.Category,
				Capabilities:       s.Capabilities,
				Recipient:          s.Recipient,
				Asset:              s.Asset,
				PricingModel:       s.PricingModel,
				FixedPrice:         s.FixedPrice,
				MaxPrice:           s.MaxPrice,
				TrustStatus:        s.TrustStatus,
				SuccessRateBps:     s.SuccessRateBps,
				AverageLatencyMs:   s.AverageLatencyMs,
				IsMockProvider:     false,
				Source:             "REAL_REGISTRY",
				CapabilityEvidence: fmt.Sprintf("ON_CHAIN_REGISTRY_VERIFIED (TrustStatus: %s)", s.TrustStatus),
			})
		}
	}

	// Deterministic mock providers where real integrations are unavailable
	if len(results) == 0 {
		mockID := fmt.Sprintf("mock-%s-provider", strings.ReplaceAll(capClean, "_", "-"))
		results = append(results, &DiscoveredProvider{
			ID:                 mockID,
			Name:               fmt.Sprintf("Deterministic Mock %s Provider", strings.Title(strings.ReplaceAll(capClean, "_", " "))),
			Category:           "SANDBOX",
			Capabilities:       []string{capClean},
			Recipient:          "0x1111111111111111111111111111111111111111",
			Asset:              "USDC",
			PricingModel:       "VARIABLE",
			MaxPrice:           "1000000",
			TrustStatus:        "MOCK_VERIFIED",
			SuccessRateBps:     9900,
			AverageLatencyMs:   250,
			IsMockProvider:     true,
			Source:             "MOCK",
			CapabilityEvidence: "DETERMINISTIC_MOCK_SANDBOX_EVIDENCE_V1",
		})
	}

	return results, nil
}

// RequestQuote obtains a typed, time-bound quote from the provider.
func (d *RegistryProviderDiscovery) RequestQuote(
	ctx context.Context,
	providerID, capability, maxBudget, currency string,
) (*Quote, error) {
	if currency == "" {
		currency = "USDC"
	}

	now := time.Now().UTC()
	expiresAt := now.Add(15 * time.Minute)

	// Check if this is a registered service
	if d.reg != nil {
		svc, err := d.reg.Resolve(providerID)
		if err == nil && svc != nil {
			quoteAmount := svc.FixedPrice
			if quoteAmount == "" {
				budgetInt, ok1 := new(big.Int).SetString(maxBudget, 10)
				maxInt, ok2 := new(big.Int).SetString(svc.MaxPrice, 10)
				if ok1 && ok2 && budgetInt.Cmp(maxInt) < 0 {
					quoteAmount = maxBudget
				} else if svc.MaxPrice != "" {
					quoteAmount = svc.MaxPrice
				} else {
					quoteAmount = maxBudget
				}
			}

			q, err := d.reg.CreateQuoteWithTerms(
				svc.ID,
				quoteAmount,
				currency,
				fmt.Sprintf("Autonomous quote for capability %s", capability),
				"immediate",
				15*time.Minute,
			)
			if err != nil {
				return nil, err
			}

			return &Quote{
				QuoteID:            q.ID,
				ServiceID:          q.ServiceID,
				Price:              q.Amount,
				Asset:              q.Asset,
				EstimatedLatencyMs: q.EstimatedLatencyMs,
				QualityScore:       q.QualityScore,
				RiskScore:          q.RiskScore,
				ReputationScore:    q.ReputationScore,
				ExpiresAt:          q.ExpiresAt,
				RecipientBinding:   q.Recipient,
				CreatedAt:          q.CreatedAt,
				CapabilityEvidence: fmt.Sprintf("AUTHORITATIVE_REGISTRY_PROOF (provider: %s)", svc.ID),
				ServiceTerms:       "SLA: 99.9% uptime, max 2000ms latency, 15m quote expiry",
				IsMockProvider:     false,
				Source:             "REAL_REGISTRY",
			}, nil
		}
	}

	// Deterministic mock quote
	randBytes := make([]byte, 8)
	_, _ = rand.Read(randBytes)
	quoteID := fmt.Sprintf("quote_mock_%s", hex.EncodeToString(randBytes))

	quotePrice := maxBudget
	if maxBudget == "" {
		quotePrice = "500000" // 0.50 USDC fallback
	}

	return &Quote{
		QuoteID:            quoteID,
		ServiceID:          providerID,
		Price:              quotePrice,
		Asset:              currency,
		EstimatedLatencyMs: 300,
		QualityScore:       9000,
		RiskScore:          500,
		ReputationScore:    9500,
		ExpiresAt:          expiresAt,
		RecipientBinding:   "0x1111111111111111111111111111111111111111",
		CreatedAt:          now,
		CapabilityEvidence: "DETERMINISTIC_MOCK_QUOTE_ATTESTATION",
		ServiceTerms:       "DETERMINISTIC_SIMULATION_TERMS (ZERO REAL SETTLEMENT)",
		IsMockProvider:     true,
		Source:             "MOCK",
	}, nil
}

// ValidateQuote validates completeness, expiry, currency, and budget adherence.
func (d *RegistryProviderDiscovery) ValidateQuote(q *Quote, maxBudget, currency string) error {
	if q == nil {
		return errors.New("quote is nil")
	}
	if strings.TrimSpace(q.QuoteID) == "" || strings.TrimSpace(q.ServiceID) == "" {
		return ErrQuoteIncomplete
	}
	if !q.ExpiresAt.IsZero() && time.Now().UTC().After(q.ExpiresAt) {
		return ErrQuoteExpiredGate
	}
	if currency != "" && q.Asset != "" && !strings.EqualFold(q.Asset, currency) {
		return ErrQuoteCurrencyGate
	}
	priceInt, ok := new(big.Int).SetString(strings.TrimSpace(q.Price), 10)
	if !ok || priceInt.Sign() <= 0 {
		return ErrMalformedPriceGate
	}
	if maxBudget != "" {
		budgetInt, ok := new(big.Int).SetString(strings.TrimSpace(maxBudget), 10)
		if ok && budgetInt.Sign() > 0 && priceInt.Cmp(budgetInt) > 0 {
			return ErrQuoteOverBudgetGate
		}
	}
	return nil
}
