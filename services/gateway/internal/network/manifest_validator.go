package network

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
)

var (
	ErrUnsupportedProtocolVersion = errors.New("unsupported protocol version: must be " + ProtocolVersionV1)
	ErrMissingAgentID             = errors.New("missing agent_id in manifest")
	ErrMissingAgentName           = errors.New("missing agent name in manifest")
	ErrEmptyCapabilities          = errors.New("manifest must declare at least one capability")
	ErrMissingPricing             = errors.New("manifest must declare pricing for capabilities")
	ErrInvalidSettlement          = errors.New("manifest must declare at least one supported settlement method (e.g. ARC_USDC)")
	ErrDangerousEndpoint          = errors.New("manifest declares an unpermitted or dangerous endpoint URL")
	ErrForbiddenAuthorityField    = errors.New("manifest declares forbidden financial authority or private key attributes")
)

// AgentManifestValidator enforces strict schema validation and security rules on agent manifests.
type AgentManifestValidator struct {
	allowLocalhost bool
}

// NewAgentManifestValidator creates a new validator. In production, allowLocalhost is false.
func NewAgentManifestValidator(allowLocalhost bool) *AgentManifestValidator {
	return &AgentManifestValidator{
		allowLocalhost: allowLocalhost,
	}
}

// ValidateManifest parses and validates an agent manifest against the Open Agent Network security rules.
func (v *AgentManifestValidator) ValidateManifest(manifest *AgentManifest) error {
	if manifest == nil {
		return errors.New("manifest cannot be nil")
	}

	// 1. Protocol Version Check
	if strings.TrimSpace(manifest.ProtocolVersion) != ProtocolVersionV1 {
		return fmt.Errorf("%w (got: %s)", ErrUnsupportedProtocolVersion, manifest.ProtocolVersion)
	}

	// 2. Identity Attributes
	if strings.TrimSpace(manifest.AgentID) == "" {
		return ErrMissingAgentID
	}
	if strings.TrimSpace(manifest.Name) == "" {
		return ErrMissingAgentName
	}

	// 3. Capabilities Check
	if len(manifest.Capabilities) == 0 {
		return ErrEmptyCapabilities
	}
	for _, capStr := range manifest.Capabilities {
		name, _, err := ParseCapabilityVersion(capStr)
		if err != nil {
			return fmt.Errorf("invalid capability declaration '%s': %w", capStr, err)
		}
		if err := ValidateCapabilityName(name); err != nil {
			return err
		}
	}

	// 4. Pricing Check
	if len(manifest.Pricing) == 0 {
		return ErrMissingPricing
	}
	for _, p := range manifest.Pricing {
		if strings.TrimSpace(p.Capability) == "" {
			return errors.New("pricing entry missing capability")
		}
		if strings.TrimSpace(p.BasePrice) == "" {
			return fmt.Errorf("pricing for capability '%s' missing base_price", p.Capability)
		}
		if strings.ToUpper(strings.TrimSpace(p.Currency)) != "USDC" {
			return fmt.Errorf("unsupported currency '%s' in pricing (must be USDC)", p.Currency)
		}
	}

	// 5. Settlement Methods Check
	if len(manifest.Settlement) == 0 {
		return ErrInvalidSettlement
	}
	hasArcUSDC := false
	for _, s := range manifest.Settlement {
		if strings.ToUpper(strings.TrimSpace(s)) == "ARC_USDC" {
			hasArcUSDC = true
			break
		}
	}
	if !hasArcUSDC {
		return fmt.Errorf("settlement must include 'ARC_USDC', got: %v", manifest.Settlement)
	}

	// 6. Dangerous Endpoint Validation (SSRF Prevention)
	if err := v.validateEndpoint(manifest.Endpoints.TaskURL); err != nil {
		return fmt.Errorf("invalid task_url: %w", err)
	}
	if manifest.Endpoints.HealthURL != "" {
		if err := v.validateEndpoint(manifest.Endpoints.HealthURL); err != nil {
			return fmt.Errorf("invalid health_url: %w", err)
		}
	}

	// 7. Security: Prohibition of Arbitrary Financial Authority
	rawBytes, err := json.Marshal(manifest)
	if err != nil {
		return fmt.Errorf("failed to serialize manifest: %w", err)
	}
	lowerRaw := strings.ToLower(string(rawBytes))
	forbiddenKeys := []string{
		"private_key",
		"privatekey",
		"secret_key",
		"secretkey",
		"signer_key",
		"signing_secret",
		"treasury_auth",
		"bypass_policy",
		"spending_elevation",
		"agent_vault_admin",
	}
	for _, forbidden := range forbiddenKeys {
		if strings.Contains(lowerRaw, `"`+forbidden+`"`) {
			return fmt.Errorf("%w: field '%s' detected", ErrForbiddenAuthorityField, forbidden)
		}
	}

	return nil
}

// validateEndpoint ensures endpoints are valid HTTPS URLs and not internal SSRF targets.
func (v *AgentManifestValidator) validateEndpoint(rawURL string) error {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return errors.New("endpoint URL cannot be empty")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return fmt.Errorf("malformed URL: %w", err)
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "https" && !(v.allowLocalhost && (scheme == "http" || scheme == "https")) {
		return fmt.Errorf("%w: scheme must be https (got %s)", ErrDangerousEndpoint, scheme)
	}

	hostname := strings.ToLower(parsed.Hostname())
	if hostname == "" {
		return fmt.Errorf("%w: empty hostname", ErrDangerousEndpoint)
	}

	// Block internal cloud metadata IP
	if hostname == "169.254.169.254" || hostname == "metadata.google.internal" || hostname == "instance-data" {
		return fmt.Errorf("%w: access to cloud metadata IP blocked", ErrDangerousEndpoint)
	}

	// Block local network unless explicitly allowed for testing
	if !v.allowLocalhost {
		if hostname == "localhost" || hostname == "127.0.0.1" || hostname == "::1" ||
			strings.HasPrefix(hostname, "10.") ||
			strings.HasPrefix(hostname, "192.168.") ||
			(strings.HasPrefix(hostname, "172.") && isPrivate172(hostname)) {
			return fmt.Errorf("%w: access to private IP or localhost blocked in production (%s)", ErrDangerousEndpoint, hostname)
		}
	}

	return nil
}

func isPrivate172(ipStr string) bool {
	var b1, b2 int
	_, err := fmt.Sscanf(ipStr, "%d.%d", &b1, &b2)
	if err != nil {
		return false
	}
	return b1 == 172 && b2 >= 16 && b2 <= 31
}
