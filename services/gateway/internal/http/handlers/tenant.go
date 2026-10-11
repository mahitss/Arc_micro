package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/arc-agentpay/agentpay/services/gateway/internal/http/middleware"
)

// getQueryOrg extracts the tenant organization ID from query parameters,
// checking "organization_id", "org_id", and "tenant_id", and detecting conflicts.
func getQueryOrg(r *http.Request) (string, error) {
	qOrg := strings.TrimSpace(r.URL.Query().Get("organization_id"))
	qOrgAlt := strings.TrimSpace(r.URL.Query().Get("org_id"))
	qTenant := strings.TrimSpace(r.URL.Query().Get("tenant_id"))

	var nonEmpties []string
	if qOrg != "" {
		nonEmpties = append(nonEmpties, qOrg)
	}
	if qOrgAlt != "" {
		nonEmpties = append(nonEmpties, qOrgAlt)
	}
	if qTenant != "" {
		nonEmpties = append(nonEmpties, qTenant)
	}

	if len(nonEmpties) == 0 {
		return "", nil
	}

	first := nonEmpties[0]
	for _, val := range nonEmpties[1:] {
		if val != first {
			return "", errors.New("conflicting organization IDs in query parameters")
		}
	}
	return first, nil
}

// getHeaderOrg extracts tenant identifier from custom headers if present.
func getHeaderOrg(r *http.Request) (string, error) {
	hOrg := strings.TrimSpace(r.Header.Get("X-Organization-Id"))
	if hOrg == "" {
		hOrg = strings.TrimSpace(r.Header.Get("X-Organization-ID"))
	}
	hTenant := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))

	if hOrg != "" && hTenant != "" && hOrg != hTenant {
		return "", errors.New("conflicting organization IDs in request headers")
	}
	if hOrg != "" {
		return hOrg, nil
	}
	return hTenant, nil
}

// resolveTenant validates and extracts the authoritative organization ID for a request.
// Ordinary callers are strictly bound to their authenticated organization.
// If requestedOrg is specified and differs from the authenticated org, it requires admin scope.
// Writes an appropriate HTTP error (401 or 403) and returns ("", false) if validation fails.
func resolveTenant(w http.ResponseWriter, r *http.Request, explicitOrg, reqID string) (string, bool) {
	org, ok := middleware.ResolveTenantOrg(r.Context(), explicitOrg)
	if !ok {
		authOrg := middleware.GetOrgID(r.Context())
		if authOrg == "" {
			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required to access tenant resources", reqID)
			return "", false
		}
		writeError(w, http.StatusForbidden, "FORBIDDEN", "Cross-organization access prohibited: admin scope required", reqID)
		return "", false
	}
	return org, true
}

// resolveTenantConflict checks for conflicting tenant IDs between query and body parameters,
// and enforces tenant isolation via ResolveTenantOrg.
func resolveTenantConflict(w http.ResponseWriter, r *http.Request, queryOrg, bodyOrg, reqID string) (string, bool) {
	queryOrg = strings.TrimSpace(queryOrg)
	bodyOrg = strings.TrimSpace(bodyOrg)
	if queryOrg != "" && bodyOrg != "" && queryOrg != bodyOrg {
		writeError(w, http.StatusBadRequest, "CONFLICTING_TENANT_ID", "Conflicting organization IDs in query parameter and request body", reqID)
		return "", false
	}
	explicitOrg := queryOrg
	if explicitOrg == "" {
		explicitOrg = bodyOrg
	}
	return resolveTenant(w, r, explicitOrg, reqID)
}

// resolveTenantFromRequest handles extracting tenant ID from query, header, and optional body ID,
// verifying no conflicting parameters exist and enforcing tenant isolation.
func resolveTenantFromRequest(w http.ResponseWriter, r *http.Request, bodyOrg, reqID string) (string, bool) {
	qOrg, err := getQueryOrg(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CONFLICTING_TENANT_ID", err.Error(), reqID)
		return "", false
	}

	hOrg, err := getHeaderOrg(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "CONFLICTING_TENANT_ID", err.Error(), reqID)
		return "", false
	}

	// Verify no conflict between query and header
	if qOrg != "" && hOrg != "" && qOrg != hOrg {
		writeError(w, http.StatusBadRequest, "CONFLICTING_TENANT_ID", "Conflicting organization IDs in query and header parameters", reqID)
		return "", false
	}

	selectedParamOrg := qOrg
	if selectedParamOrg == "" {
		selectedParamOrg = hOrg
	}

	return resolveTenantConflict(w, r, selectedParamOrg, bodyOrg, reqID)
}
