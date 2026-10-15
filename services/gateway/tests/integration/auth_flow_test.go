package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/config"
	gwHttp "github.com/arc-agentpay/agentpay/services/gateway/internal/http"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

func setupAuthTestServer() (*httptest.Server, storage.Repository) {
	cfg := &config.Config{
		Port:                "8080",
		MaxRequestBodyBytes: 1048576,
	}
	repo := storage.NewMemoryRepository()
	router := gwHttp.NewRouter(cfg, nil, nil, nil, nil, repo, nil)
	server := httptest.NewServer(router)
	return server, repo
}

func TestAuth_SignupLoginMeLogoutFlow(t *testing.T) {
	server, _ := setupAuthTestServer()
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}

	// 1. Invalid signup: password too short (< 8 chars)
	shortBody, _ := json.Marshal(map[string]string{
		"email":    "alice@example.com",
		"password": "short",
		"name":     "Alice",
	})
	resp, err := client.Post(server.URL+"/v1/auth/signup", "application/json", bytes.NewReader(shortBody))
	if err != nil {
		t.Fatalf("failed signup request: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for short password, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 2. Valid signup
	validBody, _ := json.Marshal(map[string]string{
		"email":    "alice@example.com",
		"password": "Password123!",
		"name":     "Alice Smith",
		"org_name": "Smith Robotics",
	})
	resp, err = client.Post(server.URL+"/v1/auth/signup", "application/json", bytes.NewReader(validBody))
	if err != nil {
		t.Fatalf("failed signup request: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created for valid signup, got %d", resp.StatusCode)
	}

	var signupResult struct {
		User struct {
			ID             string `json:"id"`
			OrganizationID string `json:"organization_id"`
			Email          string `json:"email"`
			Name           string `json:"name"`
			Role           string `json:"role"`
		} `json:"user"`
		Organization struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"organization"`
		Session struct {
			Token     string    `json:"token"`
			ExpiresAt time.Time `json:"expires_at"`
		} `json:"session"`
		APIKey *struct {
			Secret string `json:"secret"`
		} `json:"api_key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&signupResult); err != nil {
		t.Fatalf("failed to decode signup response: %v", err)
	}
	resp.Body.Close()

	if signupResult.User.Email != "alice@example.com" {
		t.Errorf("expected email alice@example.com, got %s", signupResult.User.Email)
	}
	if signupResult.Organization.Name != "Smith Robotics" {
		t.Errorf("expected org name Smith Robotics, got %s", signupResult.Organization.Name)
	}
	if !strings.HasPrefix(signupResult.Session.Token, "aps_") {
		t.Errorf("expected session token to start with aps_, got %s", signupResult.Session.Token)
	}
	if signupResult.APIKey == nil || !strings.HasPrefix(signupResult.APIKey.Secret, "ap_live_") {
		t.Errorf("expected initial developer API key to be provisioned")
	}

	sessionToken := signupResult.Session.Token

	// 3. Duplicate signup must fail with 409 Conflict
	resp, err = client.Post(server.URL+"/v1/auth/signup", "application/json", bytes.NewReader(validBody))
	if err != nil {
		t.Fatalf("failed duplicate signup: %v", err)
	}
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 Conflict for duplicate email, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 4. Authenticated request using Session Token to /v1/auth/me
	meReq, _ := http.NewRequest("GET", server.URL+"/v1/auth/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+sessionToken)
	resp, err = client.Do(meReq)
	if err != nil {
		t.Fatalf("failed to call /v1/auth/me: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for /v1/auth/me, got %d", resp.StatusCode)
	}

	var meResult struct {
		Authenticated  bool `json:"authenticated"`
		OrganizationID string `json:"organization_id"`
		User           struct {
			Email string `json:"email"`
		} `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&meResult); err != nil {
		t.Fatalf("failed to decode /v1/auth/me response: %v", err)
	}
	resp.Body.Close()

	if !meResult.Authenticated {
		t.Errorf("expected authenticated=true")
	}
	if meResult.User.Email != "alice@example.com" {
		t.Errorf("expected user email alice@example.com, got %s", meResult.User.Email)
	}

	// 5. Login with invalid password fails with 401 Unauthorized
	badLogin, _ := json.Marshal(map[string]string{
		"email":    "alice@example.com",
		"password": "WrongPassword!",
	})
	resp, err = client.Post(server.URL+"/v1/auth/login", "application/json", bytes.NewReader(badLogin))
	if err != nil {
		t.Fatalf("failed login attempt: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for incorrect password, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 6. Login with correct password succeeds with 200 OK
	goodLogin, _ := json.Marshal(map[string]string{
		"email":    "alice@example.com",
		"password": "Password123!",
	})
	resp, err = client.Post(server.URL+"/v1/auth/login", "application/json", bytes.NewReader(goodLogin))
	if err != nil {
		t.Fatalf("failed valid login: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for valid login, got %d", resp.StatusCode)
	}

	var loginResult struct {
		Session struct {
			Token string `json:"token"`
		} `json:"session"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&loginResult); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	resp.Body.Close()

	if !strings.HasPrefix(loginResult.Session.Token, "aps_") {
		t.Errorf("expected fresh session token from login, got %s", loginResult.Session.Token)
	}

	// 7. Logout revokes the session
	logoutReq, _ := http.NewRequest("POST", server.URL+"/v1/auth/logout", nil)
	logoutReq.Header.Set("Authorization", "Bearer "+loginResult.Session.Token)
	resp, err = client.Do(logoutReq)
	if err != nil {
		t.Fatalf("failed logout request: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for logout, got %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 8. Revoked session now fails with 401 Unauthorized
	meRevokedReq, _ := http.NewRequest("GET", server.URL+"/v1/auth/me", nil)
	meRevokedReq.Header.Set("Authorization", "Bearer "+loginResult.Session.Token)
	resp, err = client.Do(meRevokedReq)
	if err != nil {
		t.Fatalf("failed to call /v1/auth/me after logout: %v", err)
	}
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized after session revoked, got %d", resp.StatusCode)
	}
	resp.Body.Close()
}
