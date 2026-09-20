package webhook

import (
	"errors"
	"net"
	"testing"
)

func TestSSRF_LoopbackBlocked(t *testing.T) {
	v := NewSSRFValidator(false)

	err := v.ValidateIP(net.ParseIP("127.0.0.1"))
	if !errors.Is(err, ErrLoopbackBlocked) {
		t.Fatalf("expected ErrLoopbackBlocked, got: %v", err)
	}

	err6 := v.ValidateIP(net.ParseIP("::1"))
	if !errors.Is(err6, ErrLoopbackBlocked) {
		t.Fatalf("expected ErrLoopbackBlocked for IPv6 ::1, got: %v", err6)
	}
}

func TestSSRF_MetadataBlocked(t *testing.T) {
	v := NewSSRFValidator(false)

	err := v.ValidateIP(net.ParseIP("169.254.169.254"))
	if !errors.Is(err, ErrMetadataEndpointBlocked) {
		t.Fatalf("expected ErrMetadataEndpointBlocked, got: %v", err)
	}
}

func TestSSRF_PrivateRangesBlocked(t *testing.T) {
	v := NewSSRFValidator(false)

	testCases := []string{
		"10.0.0.1",
		"10.254.0.1",
		"172.16.0.1",
		"172.31.255.255",
		"192.168.1.1",
		"192.168.0.254",
		"169.254.1.1",
	}

	for _, ipStr := range testCases {
		err := v.ValidateIP(net.ParseIP(ipStr))
		if !errors.Is(err, ErrPrivateIPBlocked) {
			t.Errorf("expected ErrPrivateIPBlocked for %s, got: %v", ipStr, err)
		}
	}
}

func TestSSRF_HTTPProhibitedInProduction(t *testing.T) {
	v := NewSSRFValidator(false)

	_, err := v.ValidateURL("http://api.example.com/webhook")
	if !errors.Is(err, ErrInvalidURLScheme) {
		t.Fatalf("expected ErrInvalidURLScheme, got: %v", err)
	}
}
