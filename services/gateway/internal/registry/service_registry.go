package registry

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"
)

var (
	ErrServiceNotFound = errors.New("service not found in registry")
	ErrServiceDisabled = errors.New("service is currently disabled")
	ErrPriceExceeded   = errors.New("requested amount exceeds maximum allowed price for service")
	ErrInvalidAsset    = errors.New("requested asset is not supported by service")
	ErrInvalidAmount   = errors.New("invalid amount: must be positive integer base units")
	ErrQuoteExpired    = errors.New("quote has expired")
	ErrQuoteNotFound   = errors.New("quote not found")
	ErrQuoteMismatch   = errors.New("quote parameters do not match payment request")
)

// Trust status constants
const (
	TrustStatusTrusted   = "TRUSTED"
	TrustStatusVerified  = "VERIFIED"
	TrustStatusUnverified = "UNVERIFIED"
	TrustStatusDisabled  = "DISABLED"
)

// Category constants
const (
	CategoryResearch = "RESEARCH"
	CategoryData     = "DATA"
	CategoryCompute  = "COMPUTE"
	CategoryOracle   = "ORACLE"
	CategoryAIModels = "AI_MODELS"
)

// Pricing model constants
const (
	PricingModelFixed         = "FIXED"
	PricingModelVariable      = "VARIABLE"
	PricingModelQuoteRequired = "QUOTE_REQUIRED"
)

// Service represents a registered external service provider in the AgentPay economy.
type Service struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Category     string `json:"category"`
	Recipient    string `json:"recipient"`      // Authoritative server-side settlement address
	Asset        string `json:"asset"`          // Default "USDC"
	Enabled      bool   `json:"enabled"`
	MaxPrice     string `json:"max_price"`      // Maximum allowable price in base units
	FixedPrice   string `json:"fixed_price,omitempty"`
	PricingModel string `json:"pricing_model"`  // FIXED, VARIABLE, QUOTE_REQUIRED
	TrustStatus  string `json:"trust_status"`   // TRUSTED, VERIFIED, UNVERIFIED, DISABLED
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// Quote represents a time-bound, cryptographically identified pricing commitment.
type Quote struct {
	ID        string    `json:"quote_id"`
	ServiceID string    `json:"service_id"`
	Recipient string    `json:"recipient"`
	Amount    string    `json:"amount"`
	Asset     string    `json:"asset"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// Registry manages the set of approved external services and quotes.
type Registry struct {
	mu       sync.RWMutex
	services map[string]*Service
	quotes   map[string]*Quote
}

// NewDefaultRegistry creates a Registry populated with initial authorized services.
func NewDefaultRegistry() *Registry {
	r := &Registry{
		services: make(map[string]*Service),
		quotes:   make(map[string]*Quote),
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// 1. Web Research & Intelligence API
	r.Register(&Service{
		ID:           "web-research",
		Name:         "Web Research & Intelligence API",
		Description:  "Real-time web search, document scraping, and intelligence synthesis.",
		Category:     CategoryResearch,
		Recipient:    "0x1111111111111111111111111111111111111111",
		Asset:        "USDC",
		Enabled:      true,
		MaxPrice:     "500000", // 0.50 USDC
		PricingModel: PricingModelVariable,
		TrustStatus:  TrustStatusTrusted,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	// 2. GPU Inference Compute Cluster
	r.Register(&Service{
		ID:           "compute-cluster",
		Name:         "GPU Inference Compute Cluster",
		Description:  "On-demand H100 compute for embeddings, fine-tuning, and heavy inference.",
		Category:     CategoryCompute,
		Recipient:    "0x2222222222222222222222222222222222222222",
		Asset:        "USDC",
		Enabled:      true,
		MaxPrice:     "2000000", // 2.00 USDC
		PricingModel: PricingModelVariable,
		TrustStatus:  TrustStatusTrusted,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	// 3. Real-time Financial Data Feed
	r.Register(&Service{
		ID:           "data-feed",
		Name:         "Real-time Financial Data Feed",
		Description:  "Streaming liquidity, orderbook depth, and volatility telemetry on Arc.",
		Category:     CategoryData,
		Recipient:    "0x3333333333333333333333333333333333333333",
		Asset:        "USDC",
		Enabled:      true,
		MaxPrice:     "100000", // 0.10 USDC
		FixedPrice:   "100000",
		PricingModel: PricingModelFixed,
		TrustStatus:  TrustStatusVerified,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	// 4. Autonomous Research Data Provider (Higher value, requires quotes/approval)
	r.Register(&Service{
		ID:           "research-api",
		Name:         "Autonomous Research Data Provider",
		Description:  "Institutional-grade market analysis and on-chain intelligence dossiers.",
		Category:     CategoryResearch,
		Recipient:    "0x5555555555555555555555555555555555555555",
		Asset:        "USDC",
		Enabled:      true,
		MaxPrice:     "25000000", // 25.00 USDC
		PricingModel: PricingModelVariable,
		TrustStatus:  TrustStatusTrusted,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	// 5. Arc Decentralized Oracle Network
	r.Register(&Service{
		ID:           "oracle-network",
		Name:         "Arc Decentralized Oracle Network",
		Description:  "Cryptographically signed price feeds and cross-chain state proofs.",
		Category:     CategoryOracle,
		Recipient:    "0x6666666666666666666666666666666666666666",
		Asset:        "USDC",
		Enabled:      true,
		MaxPrice:     "300000", // 0.30 USDC
		FixedPrice:   "300000",
		PricingModel: PricingModelFixed,
		TrustStatus:  TrustStatusTrusted,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	// 6. Unverified Community Provider (Unverified trust status)
	r.Register(&Service{
		ID:           "community-indexer",
		Name:         "Community Block Indexer",
		Description:  "Third-party experimental block indexer service.",
		Category:     CategoryData,
		Recipient:    "0x7777777777777777777777777777777777777777",
		Asset:        "USDC",
		Enabled:      true,
		MaxPrice:     "1500000",
		PricingModel: PricingModelVariable,
		TrustStatus:  TrustStatusUnverified,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	// 7. Deprecated / Disabled Legacy Service
	r.Register(&Service{
		ID:           "archived-service",
		Name:         "Deprecated Legacy Data Service",
		Description:  "Decommissioned data feed service.",
		Category:     CategoryData,
		Recipient:    "0x4444444444444444444444444444444444444444",
		Asset:        "USDC",
		Enabled:      false, // Explicitly disabled
		MaxPrice:     "100000",
		PricingModel: PricingModelFixed,
		TrustStatus:  TrustStatusDisabled,
		CreatedAt:    now,
		UpdatedAt:    now,
	})

	return r
}

// Register adds or updates a service in the registry.
func (r *Registry) Register(s *Service) {
	r.mu.Lock()
	defer r.mu.Unlock()
	copyService := *s
	r.services[s.ID] = &copyService
}

// Resolve retrieves a service by ID, verifying existence and enabled status.
func (r *Registry) Resolve(serviceID string) (*Service, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	s, ok := r.services[serviceID]
	if !ok {
		return nil, fmt.Errorf("%w: '%s'", ErrServiceNotFound, serviceID)
	}
	if !s.Enabled || s.TrustStatus == TrustStatusDisabled {
		return nil, fmt.Errorf("%w: '%s'", ErrServiceDisabled, serviceID)
	}

	copyService := *s
	return &copyService, nil
}

// ValidatePayment resolves the service and validates the amount and asset constraints.
func (r *Registry) ValidatePayment(serviceID, amount, asset string) (*Service, error) {
	s, err := r.Resolve(serviceID)
	if err != nil {
		return nil, err
	}

	if asset != s.Asset {
		return nil, fmt.Errorf("%w: expected %s, got %s", ErrInvalidAsset, s.Asset, asset)
	}

	amtInt, ok := new(big.Int).SetString(amount, 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, ErrInvalidAmount
	}

	// Fixed price check
	if s.FixedPrice != "" {
		fixedInt, _ := new(big.Int).SetString(s.FixedPrice, 10)
		if amtInt.Cmp(fixedInt) != 0 {
			return nil, fmt.Errorf("exact fixed price %s required, got %s", s.FixedPrice, amount)
		}
	}

	// Max price check
	if s.MaxPrice != "" {
		maxInt, _ := new(big.Int).SetString(s.MaxPrice, 10)
		if amtInt.Cmp(maxInt) > 0 {
			return nil, fmt.Errorf("%w: amount %s exceeds max %s", ErrPriceExceeded, amount, s.MaxPrice)
		}
	}

	return s, nil
}

// List returns all registered services.
func (r *Registry) List() []*Service {
	return r.ListWithFilter("", "", "", false)
}

// ListWithFilter returns all registered services matching optional filters.
func (r *Registry) ListWithFilter(category, asset, trustStatus string, enabledOnly bool) []*Service {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]*Service, 0, len(r.services))
	for _, s := range r.services {
		if enabledOnly && (!s.Enabled || s.TrustStatus == TrustStatusDisabled) {
			continue
		}
		if category != "" && !strings.EqualFold(s.Category, category) {
			continue
		}
		if asset != "" && !strings.EqualFold(s.Asset, asset) {
			continue
		}
		if trustStatus != "" && !strings.EqualFold(s.TrustStatus, trustStatus) {
			continue
		}
		copyService := *s
		list = append(list, &copyService)
	}
	return list
}

// CreateQuote creates a 15-minute time-bound quote for a service.
func (r *Registry) CreateQuote(serviceID, requestedAmount, asset string) (*Quote, error) {
	s, err := r.Resolve(serviceID)
	if err != nil {
		return nil, err
	}

	if asset == "" {
		asset = s.Asset
	}
	if asset != s.Asset {
		return nil, fmt.Errorf("%w: expected %s, got %s", ErrInvalidAsset, s.Asset, asset)
	}

	finalAmount := requestedAmount
	if s.FixedPrice != "" {
		finalAmount = s.FixedPrice
	} else if finalAmount == "" {
		finalAmount = s.MaxPrice
	}

	amtInt, ok := new(big.Int).SetString(finalAmount, 10)
	if !ok || amtInt.Sign() <= 0 {
		return nil, ErrInvalidAmount
	}

	if s.MaxPrice != "" {
		maxInt, _ := new(big.Int).SetString(s.MaxPrice, 10)
		if amtInt.Cmp(maxInt) > 0 {
			return nil, fmt.Errorf("%w: requested %s exceeds max %s", ErrPriceExceeded, finalAmount, s.MaxPrice)
		}
	}

	// Generate random quote ID: qt_<16 hex bytes>
	randBytes := make([]byte, 16)
	_, _ = rand.Read(randBytes)
	quoteID := fmt.Sprintf("qt_%s", hex.EncodeToString(randBytes))

	now := time.Now().UTC()
	quote := &Quote{
		ID:        quoteID,
		ServiceID: s.ID,
		Recipient: s.Recipient,
		Amount:    finalAmount,
		Asset:     s.Asset,
		CreatedAt: now,
		ExpiresAt: now.Add(15 * time.Minute),
	}

	r.mu.Lock()
	r.quotes[quoteID] = quote
	r.mu.Unlock()

	return quote, nil
}

// GetQuote retrieves a quote by ID if not expired.
func (r *Registry) GetQuote(quoteID string) (*Quote, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	q, ok := r.quotes[quoteID]
	if !ok {
		return nil, ErrQuoteNotFound
	}
	if time.Now().UTC().After(q.ExpiresAt) {
		return nil, ErrQuoteExpired
	}

	copyQuote := *q
	return &copyQuote, nil
}

// ValidateQuote verifies that a quote is valid and matches payment parameters.
func (r *Registry) ValidateQuote(quoteID, serviceID, amount, asset string) (*Quote, error) {
	q, err := r.GetQuote(quoteID)
	if err != nil {
		return nil, err
	}

	if q.ServiceID != serviceID {
		return nil, fmt.Errorf("%w: quote is for service '%s', not '%s'", ErrQuoteMismatch, q.ServiceID, serviceID)
	}
	if q.Amount != amount {
		return nil, fmt.Errorf("%w: quote amount is '%s', got '%s'", ErrQuoteMismatch, q.Amount, amount)
	}
	if q.Asset != asset {
		return nil, fmt.Errorf("%w: quote asset is '%s', got '%s'", ErrQuoteMismatch, q.Asset, asset)
	}

	return q, nil
}
