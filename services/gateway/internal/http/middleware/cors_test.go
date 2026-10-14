package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORS_PreflightHeaders(t *testing.T) {
	origins := []string{"https://agentpay.vercel.app", "https://preview.vercel.app"}
	handler := CORS(origins)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/v1/missions", nil)
	req.Header.Set("Origin", "https://agentpay.vercel.app")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "Content-Type, X-Organization-Id, Authorization")

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204 No Content for OPTIONS preflight, got %d", w.Code)
	}

	allowOrigin := w.Header().Get("Access-Control-Allow-Origin")
	if allowOrigin != "https://agentpay.vercel.app" {
		t.Errorf("expected Access-Control-Allow-Origin 'https://agentpay.vercel.app', got '%s'", allowOrigin)
	}

	allowHeaders := w.Header().Get("Access-Control-Allow-Headers")
	for _, expectedHeader := range []string{"X-Organization-Id", "X-Organization-ID", "X-API-Key", "Authorization", "Content-Type"} {
		if !strings.Contains(allowHeaders, expectedHeader) {
			t.Errorf("expected Access-Control-Allow-Headers to contain '%s', got '%s'", expectedHeader, allowHeaders)
		}
	}
}

func TestCORS_DisallowedOrigin(t *testing.T) {
	origins := []string{"https://agentpay.vercel.app"}
	handler := CORS(origins)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/missions", nil)
	req.Header.Set("Origin", "https://malicious-site.com")

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	allowOrigin := w.Header().Get("Access-Control-Allow-Origin")
	if allowOrigin != "" {
		t.Errorf("expected empty Access-Control-Allow-Origin for unauthorized origin, got '%s'", allowOrigin)
	}
}

func TestCORS_WildcardOrigin(t *testing.T) {
	origins := []string{"*"}
	handler := CORS(origins)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/missions", nil)
	req.Header.Set("Origin", "https://any-site.com")

	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	allowOrigin := w.Header().Get("Access-Control-Allow-Origin")
	if allowOrigin != "*" {
		t.Errorf("expected '*' for wildcard origin, got '%s'", allowOrigin)
	}
}
