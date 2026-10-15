package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/auth"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/domain"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
	"github.com/arc-agentpay/agentpay/services/gateway/internal/storage"
)

// AuthHandler handles user registration, authentication, sessions, and profile endpoints.
type AuthHandler struct {
	repo storage.Repository
}

// NewAuthHandler constructs a new AuthHandler.
func NewAuthHandler(repo storage.Repository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"`
	OrgName  string `json:"org_name,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserDTO struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}

type AuthResponse struct {
	User         UserDTO               `json:"user"`
	Organization *storage.Organization `json:"organization"`
	Session      struct {
		Token     string    `json:"token"`
		ExpiresAt time.Time `json:"expires_at"`
	} `json:"session"`
	APIKey *struct {
		Secret    string `json:"secret"`
		MaskedKey string `json:"masked_key"`
		Name      string `json:"name"`
	} `json:"api_key,omitempty"`
}

// HandleSignup registers a new user, creates an isolated organization tenant, and begins a session.
func (h *AuthHandler) HandleSignup(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", reqID)
		return
	}

	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", reqID)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Email address is required", reqID)
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid email format", reqID)
		return
	}

	req.Password = strings.TrimSpace(req.Password)
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Password must be at least 8 characters", reqID)
		return
	}

	if h.repo == nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_UNAVAILABLE", "Storage repository is not initialized", reqID)
		return
	}

	// Check if user already exists
	if existing, err := h.repo.GetUserByEmail(r.Context(), req.Email); err == nil && existing != nil {
		writeError(w, http.StatusConflict, "USER_EXISTS", "A user with this email address already exists", reqID)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "AUTH_ERROR", "Failed to secure password", reqID)
		return
	}

	// Generate IDs
	randSuffix := make([]byte, 8)
	_, _ = rand.Read(randSuffix)
	orgID := fmt.Sprintf("org_%s", hex.EncodeToString(randSuffix[:4]))
	userID := fmt.Sprintf("usr_%s", hex.EncodeToString(randSuffix[4:]))

	name := strings.TrimSpace(req.Name)
	if name == "" {
		parts := strings.Split(req.Email, "@")
		name = parts[0]
	}

	orgName := strings.TrimSpace(req.OrgName)
	if orgName == "" {
		orgName = fmt.Sprintf("%s's Organization", name)
	}

	now := time.Now().UTC()

	// 1. Create Organization
	org := &storage.Organization{
		ID:        orgID,
		Name:      orgName,
		Status:    "ACTIVE",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := h.repo.SaveOrganization(r.Context(), org); err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", fmt.Sprintf("Failed to create organization: %v", err), reqID)
		return
	}

	// 2. Create User
	user := &storage.User{
		ID:             userID,
		OrganizationID: orgID,
		Email:          req.Email,
		PasswordHash:   hashedPassword,
		Name:           name,
		Role:           "admin",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := h.repo.CreateUser(r.Context(), user); err != nil {
		if errors.Is(err, storage.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "USER_EXISTS", "A user with this email address already exists", reqID)
			return
		}
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", fmt.Sprintf("Failed to create user: %v", err), reqID)
		return
	}

	// 3. Create Session
	token, tokenHash, err := auth.GenerateSessionToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "AUTH_ERROR", "Failed to generate session token", reqID)
		return
	}

	sessRand := make([]byte, 6)
	_, _ = rand.Read(sessRand)
	sessID := fmt.Sprintf("sess_%s", hex.EncodeToString(sessRand))
	expiresAt := now.Add(7 * 24 * time.Hour)

	session := &storage.Session{
		ID:             sessID,
		UserID:         userID,
		OrganizationID: orgID,
		TokenHash:      tokenHash,
		ExpiresAt:      expiresAt,
		CreatedAt:      now,
	}
	if err := h.repo.CreateSession(r.Context(), session); err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", "Failed to store user session", reqID)
		return
	}

	// 4. Provision initial developer API key for this organization
	var apiKeyDTO *struct {
		Secret    string `json:"secret"`
		MaskedKey string `json:"masked_key"`
		Name      string `json:"name"`
	}
	secret, apiKey, err := auth.GenerateAPIKey(orgID, "Initial Developer Key", []string{
		domain.ScopePaymentsRead,
		domain.ScopePaymentsCreate,
		domain.ScopeAgentsRead,
		domain.ScopeServicesRead,
		domain.ScopeAdmin,
	})
	if err == nil && apiKey != nil {
		storageKey := &storage.APIKey{
			ID:             apiKey.ID,
			OrganizationID: orgID,
			KeyHash:        apiKey.KeyHash,
			Name:           apiKey.Name,
			MaskedKey:      apiKey.MaskedKey,
			Scopes:         strings.Join(apiKey.Scopes, ","),
			Status:         string(apiKey.Status),
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		_ = h.repo.SaveAPIKey(r.Context(), storageKey)
		apiKeyDTO = &struct {
			Secret    string `json:"secret"`
			MaskedKey string `json:"masked_key"`
			Name      string `json:"name"`
		}{
			Secret:    secret,
			MaskedKey: apiKey.MaskedKey,
			Name:      apiKey.Name,
		}
	}

	// Set session cookie
	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	http.SetCookie(w, &http.Cookie{
		Name:     "agentpay_session",
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})

	resp := AuthResponse{
		User: UserDTO{
			ID:             user.ID,
			OrganizationID: user.OrganizationID,
			Email:          user.Email,
			Name:           user.Name,
			Role:           user.Role,
			CreatedAt:      user.CreatedAt,
		},
		Organization: org,
		APIKey:       apiKeyDTO,
	}
	resp.Session.Token = token
	resp.Session.ExpiresAt = expiresAt

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleLogin authenticates an existing user and returns a fresh session.
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", reqID)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload", reqID)
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Email and password are required", reqID)
		return
	}

	if h.repo == nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_UNAVAILABLE", "Storage repository is not initialized", reqID)
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", reqID)
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", reqID)
		return
	}

	org, _ := h.repo.GetOrganization(r.Context(), user.OrganizationID)

	token, tokenHash, err := auth.GenerateSessionToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "AUTH_ERROR", "Failed to generate session token", reqID)
		return
	}

	now := time.Now().UTC()
	expiresAt := now.Add(7 * 24 * time.Hour)
	sessRand := make([]byte, 6)
	_, _ = rand.Read(sessRand)
	sessID := fmt.Sprintf("sess_%s", hex.EncodeToString(sessRand))

	session := &storage.Session{
		ID:             sessID,
		UserID:         user.ID,
		OrganizationID: user.OrganizationID,
		TokenHash:      tokenHash,
		ExpiresAt:      expiresAt,
		CreatedAt:      now,
	}
	if err := h.repo.CreateSession(r.Context(), session); err != nil {
		writeError(w, http.StatusInternalServerError, "STORAGE_ERROR", "Failed to store session", reqID)
		return
	}

	isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	http.SetCookie(w, &http.Cookie{
		Name:     "agentpay_session",
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   isSecure,
		SameSite: http.SameSiteLaxMode,
	})

	resp := AuthResponse{
		User: UserDTO{
			ID:             user.ID,
			OrganizationID: user.OrganizationID,
			Email:          user.Email,
			Name:           user.Name,
			Role:           user.Role,
			CreatedAt:      user.CreatedAt,
		},
		Organization: org,
	}
	resp.Session.Token = token
	resp.Session.ExpiresAt = expiresAt

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// HandleLogout terminates the active session and clears the session cookie.
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", reqID)
		return
	}

	// Extract session token
	var token string
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	} else if cookie, err := r.Cookie("agentpay_session"); err == nil && cookie.Value != "" {
		token = cookie.Value
	}

	if token != "" && h.repo != nil {
		_ = h.repo.DeleteSession(r.Context(), auth.HashSecret(token))
	}

	// Clear cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "agentpay_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Successfully logged out",
	})
}

// HandleMe returns the currently authenticated user and organization context.
func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetRequestID(r.Context())
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed", reqID)
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	if orgID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required", reqID)
		return
	}

	userID := middleware.GetUserID(r.Context())
	userRole := middleware.GetUserRole(r.Context())
	scopes := middleware.GetScopes(r.Context())

	var userDTO *UserDTO
	if userID != "" && h.repo != nil {
		if u, err := h.repo.GetUserByID(r.Context(), userID); err == nil && u != nil {
			userDTO = &UserDTO{
				ID:             u.ID,
				OrganizationID: u.OrganizationID,
				Email:          u.Email,
				Name:           u.Name,
				Role:           u.Role,
				CreatedAt:      u.CreatedAt,
			}
		}
	}

	var org *storage.Organization
	if h.repo != nil {
		org, _ = h.repo.GetOrganization(r.Context(), orgID)
	}

	resp := map[string]interface{}{
		"authenticated":   true,
		"organization_id": orgID,
		"organization":    org,
		"scopes":          scopes,
	}
	if userDTO != nil {
		resp["user"] = userDTO
	} else if userRole != "" {
		resp["role"] = userRole
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
