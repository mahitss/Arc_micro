package webhook

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
)

var (
	ErrSSRFBlocked            = errors.New("webhook destination URL is blocked by SSRF policy")
	ErrInvalidURLScheme       = errors.New("webhook destination must use HTTPS (HTTP prohibited in production)")
	ErrMetadataEndpointBlocked = errors.New("access to cloud metadata endpoints (169.254.x.x) is strictly prohibited")
	ErrPrivateIPBlocked       = errors.New("access to private or internal network IP addresses is prohibited")
	ErrLoopbackBlocked        = errors.New("access to loopback addresses (127.0.0.1 / localhost) is prohibited")
)

// Private and reserved IP blocks for SSRF enforcement
var reservedCIDRs []*net.IPNet

func init() {
	cidrs := []string{
		"0.0.0.0/8",          // Current network
		"10.0.0.0/8",         // Private RFC 1918
		"100.64.0.0/10",      // Shared address space
		"127.0.0.0/8",        // Loopback
		"169.254.0.0/16",     // Link-local / Cloud metadata
		"172.16.0.0/12",      // Private RFC 1918
		"192.0.0.0/24",       // IETF protocol assignments
		"192.0.2.0/24",       // Documentation TEST-NET-1
		"192.88.99.0/24",     // 6to4 relay anycast
		"192.168.0.0/16",     // Private RFC 1918
		"198.18.0.0/15",      // Network benchmark tests
		"198.51.100.0/24",    // Documentation TEST-NET-2
		"203.0.113.0/24",     // Documentation TEST-NET-3
		"224.0.0.0/4",        // Multicast
		"240.0.0.0/4",        // Reserved
		"255.255.255.255/32", // Limited broadcast
		"::1/128",            // IPv6 Loopback
		"fc00::/7",           // IPv6 Unique local
		"fe80::/10",          // IPv6 Link-local
	}

	for _, cidr := range cidrs {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err == nil {
			reservedCIDRs = append(reservedCIDRs, ipNet)
		}
	}
}

// SSRFValidator provides configurable security checks on outgoing webhook URLs.
type SSRFValidator struct {
	AllowLocalhost bool // True ONLY in automated test harnesses
}

// NewSSRFValidator creates an SSRF validator enforcing strict production rules.
func NewSSRFValidator(allowLocalhost bool) *SSRFValidator {
	return &SSRFValidator{
		AllowLocalhost: allowLocalhost,
	}
}

// ValidateURL inspects the URL scheme and resolves destination host IPs to prevent SSRF.
func (v *SSRFValidator) ValidateURL(rawURL string) (*url.URL, error) {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(rawURL))
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	scheme := strings.ToLower(parsed.Scheme)
	if !v.AllowLocalhost && scheme != "https" {
		return nil, ErrInvalidURLScheme
	}
	if v.AllowLocalhost && scheme != "https" && scheme != "http" {
		return nil, ErrInvalidURLScheme
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return nil, errors.New("empty hostname in webhook URL")
	}

	// 1. Check for localhost keywords
	if !v.AllowLocalhost {
		if strings.EqualFold(hostname, "localhost") || strings.HasSuffix(strings.ToLower(hostname), ".localhost") {
			return nil, ErrLoopbackBlocked
		}
	}

	// 2. Resolve IP addresses for the hostname
	ips, err := net.LookupIP(hostname)
	if err != nil {
		// If DNS resolution fails, reject the URL
		return nil, fmt.Errorf("failed to resolve webhook host '%s': %w", hostname, err)
	}

	for _, ip := range ips {
		if err := v.ValidateIP(ip); err != nil {
			return nil, err
		}
	}

	return parsed, nil
}

// ValidateIP verifies that a resolved IP does not fall into loopback, private, or metadata CIDRs.
func (v *SSRFValidator) ValidateIP(ip net.IP) error {
	if ip.IsLoopback() {
		if !v.AllowLocalhost {
			return ErrLoopbackBlocked
		}
		return nil
	}

	// Explicit check for cloud metadata (AWS, GCP, Azure 169.254.169.254)
	if ip.String() == "169.254.169.254" {
		return ErrMetadataEndpointBlocked
	}

	// Check against all reserved CIDRs
	for _, reserved := range reservedCIDRs {
		if reserved.Contains(ip) {
			if v.AllowLocalhost && (ip.IsLoopback() || reserved.IP.IsLoopback()) {
				continue
			}
			return fmt.Errorf("%w: %s belongs to reserved range %s", ErrPrivateIPBlocked, ip.String(), reserved.String())
		}
	}

	return nil
}

// SafeDialContext creates a DialContext function that re-verifies resolved IPs at connect time,
// protecting against DNS rebinding (TOCTOU attacks).
func (v *SSRFValidator) SafeDialContext() func(ctx context.Context, network, addr string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}

		ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
		if err != nil {
			return nil, err
		}

		for _, ip := range ips {
			if err := v.ValidateIP(ip); err != nil {
				return nil, fmt.Errorf("connection blocked by SSRF policy: %w", err)
			}
		}

		var dialer net.Dialer
		return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
	}
}
