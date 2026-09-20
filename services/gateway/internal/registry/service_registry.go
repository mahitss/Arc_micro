package registry

import (
	"errors"
	"fmt"
	"math/big"
	"sync"
)

var (
	ErrServiceNotFound = errors.New("service not found in registry")
	ErrServiceDisabled = errors.New("service is currently disabled")
	ErrPriceExceeded   = errors.New("requested amount exceeds maximum allowed price for service")
	ErrInvalidAsset    = errors.New("requested asset is not supported by service")
	ErrInvalidAmount   = errors.New("invalid amount: must be positive integer base units")
)

// Service represents a registered external service provider that agents may pay.
type Service struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Recipient  string `json:"recipient"` // Authoritative server-side address
	Asset      string `json:"asset"`     // Default "USDC"
	Enabled    bool   `json:"enabled"`
	MaxPrice   string `json:"max_price"` // Maximum allowable price in base units
	FixedPrice string `json:"fixed_price,omitempty"` // If non-empty, exact price required
}

// Registry manages the set of approved external services.
type Registry struct {
	mu       sync.RWMutex
	services map[string]*Service
}

// NewDefaultRegistry creates a Registry populated with initial authorized services.
func NewDefaultRegistry() *Registry {
	r := &Registry{
		services: make(map[string]*Service),
	}

	// Default approved services
	r.Register(&Service{
		ID:        "web-research",
		Name:      "Web Research & Intelligence API",
		Recipient: "0x1111111111111111111111111111111111111111",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "500000", // 0.50 USDC
	})

	r.Register(&Service{
		ID:        "compute-cluster",
		Name:      "GPU Inference Compute Cluster",
		Recipient: "0x2222222222222222222222222222222222222222",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "2000000", // 2.00 USDC
	})

	r.Register(&Service{
		ID:        "data-feed",
		Name:      "Real-time Financial Data Feed",
		Recipient: "0x3333333333333333333333333333333333333333",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "100000", // 0.10 USDC
	})

	r.Register(&Service{
		ID:        "research-api",
		Name:      "Autonomous Research Data Provider",
		Recipient: "0x5555555555555555555555555555555555555555",
		Asset:     "USDC",
		Enabled:   true,
		MaxPrice:  "20000000", // 20.00 USDC
	})

	r.Register(&Service{
		ID:        "archived-service",
		Name:      "Deprecated Legacy Data Service",
		Recipient: "0x4444444444444444444444444444444444444444",
		Asset:     "USDC",
		Enabled:   false, // Explicitly disabled
		MaxPrice:  "100000",
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
	if !s.Enabled {
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

// List returns a list of all registered services.
func (r *Registry) List() []*Service {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]*Service, 0, len(r.services))
	for _, s := range r.services {
		copyService := *s
		list = append(list, &copyService)
	}
	return list
}
