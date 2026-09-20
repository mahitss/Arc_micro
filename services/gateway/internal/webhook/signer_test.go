package webhook

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func TestSignAndVerify_Valid(t *testing.T) {
	secret := "whsec_test_secret_1234567890abcdef1234567890abcdef"
	payload := []byte(`{"id":"evt_test_1","type":"payment_intent.confirmed"}`)
	now := time.Now().UTC().Unix()

	header := SignPayload(secret, now, payload)
	if !strings.HasPrefix(header, "t=") || !strings.Contains(header, ",v1=") {
		t.Fatalf("unexpected header format: %s", header)
	}

	err := VerifySignature(secret, header, payload, 5*time.Minute)
	if err != nil {
		t.Fatalf("expected signature to be valid, got: %v", err)
	}
}

func TestVerify_TamperedPayload(t *testing.T) {
	secret := "whsec_test_secret_1234567890abcdef"
	payload := []byte(`{"amount":"100"}`)
	tampered := []byte(`{"amount":"1000"}`)
	now := time.Now().UTC().Unix()

	header := SignPayload(secret, now, payload)
	err := VerifySignature(secret, header, tampered, 5*time.Minute)
	if !errors.Is(err, ErrSignatureMismatch) {
		t.Fatalf("expected ErrSignatureMismatch, got: %v", err)
	}
}

func TestVerify_TamperedSecret(t *testing.T) {
	secret := "whsec_test_secret_1234567890abcdef"
	wrongSecret := "whsec_wrong_secret_1234567890abcdef"
	payload := []byte(`{"test":true}`)
	now := time.Now().UTC().Unix()

	header := SignPayload(secret, now, payload)
	err := VerifySignature(wrongSecret, header, payload, 5*time.Minute)
	if !errors.Is(err, ErrSignatureMismatch) {
		t.Fatalf("expected ErrSignatureMismatch, got: %v", err)
	}
}

func TestVerify_ExpiredTimestamp(t *testing.T) {
	secret := "whsec_test_secret_1234567890abcdef"
	payload := []byte(`{"test":true}`)
	expiredTime := time.Now().UTC().Add(-10 * time.Minute).Unix()

	header := SignPayload(secret, expiredTime, payload)
	err := VerifySignature(secret, header, payload, 5*time.Minute)
	if !errors.Is(err, ErrTimestampExpired) {
		t.Fatalf("expected ErrTimestampExpired, got: %v", err)
	}
}

func TestVerify_MalformedHeader(t *testing.T) {
	secret := "whsec_test_secret_1234567890abcdef"
	payload := []byte(`{"test":true}`)

	malformed := []string{
		"invalid",
		"t=12345",
		"v1=abcdef",
		"t=abc,v1=123",
	}

	for _, h := range malformed {
		err := VerifySignature(secret, h, payload, 5*time.Minute)
		if err == nil {
			t.Fatalf("expected error for malformed header: %s", h)
		}
	}
}
