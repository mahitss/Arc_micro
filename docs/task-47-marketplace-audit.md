# Task 47 — Autonomous Marketplace Architecture & Data Provenance Audit

## 1. Executive Summary

This audit evaluates the current implementation of the AgentPay Autonomous Economic Marketplace across the frontend (`/marketplace`, `/marketplace/opportunities/[id]`, `/marketplace/listings/[id]`, `/marketplace/agents/[id]`, `/marketplace/compare`, `/marketplace/security`, and `/demo/marketplace`) and the backend Go Gateway services (`services/gateway/internal/marketplace/...`).

While the UI is aesthetically robust and the architectural boundary between the marketplace and financial authority is well-defined in code, the audit identified semantic inconsistencies, misleading fixture identifiers (`opp_live_01`), missing provenance labels on economic metrics, a category filtering bug on the frontend, and ungrounded settlement claims in simulated workflows.

---

## 2. Frontend Data Sources & Components

### Pages & Sub-routes
1. **`/marketplace` (`apps/web/src/app/marketplace/page.tsx`):**
   - Main dashboard rendering the Economic Overview strip, Work Opportunities list, and Published Service Listings.
   - Action buttons: `LAUNCH DEMO` (`/demo/marketplace`), `COMPARE` (`/marketplace/compare`), `SECURITY ANOMALY CENTER` (`/marketplace/security`).
   - Filter buttons: `All`, `Security` (`sec`), `Data Intel` (`data`).
2. **`/marketplace/opportunities/[id]` (`apps/web/src/app/marketplace/opportunities/[id]/page.tsx`):**
   - Displays opportunity requirements, specifications, policy/risk constraints, candidate ranking, "Why This Provider?" deterministic explanation, and "Award Contract" action.
3. **`/marketplace/listings/[id]` (`apps/web/src/app/marketplace/listings/[id]/page.tsx`):**
   - Displays service specifications, pricing model, latency, verification method, protocol versions, and historical performance metrics.
4. **`/marketplace/agents/[id]` (`apps/web/src/app/marketplace/agents/[id]/page.tsx`):**
   - Displays agent trust profile, verification status, total completed jobs, dispute rate, and multi-dimensional trust metrics.
5. **`/marketplace/compare` (`apps/web/src/app/marketplace/compare/page.tsx`):**
   - Side-by-side comparison of candidate providers across capabilities, latency, price, risk score, and historical completion.
6. **`/marketplace/security` (`apps/web/src/app/marketplace/security/page.tsx`):**
   - Marketplace invariant matrix (INV-181 to INV-200) and simulated anomaly signal detector.
7. **`/demo/marketplace` (`apps/web/src/app/demo/marketplace/page.tsx`):**
   - Interactive 9-stage lifecycle demonstration and adversarial injection simulator.

### Client Library (`apps/web/src/lib/api/marketplace.ts`)
- Functions: `getMarketplaceHealth()`, `getListings()`, `getListing(id)`, `getOpportunities()`, `getOpportunity(id)`, `matchOpportunity(id)`, `awardOpportunity(id, payload)`, `getAgentProfile(id)`, `getAgentPerformance(id)`, `compareProviders()`, `getSecurityAnomalies()`, `simulateMarketplace()`.
- Implements fallback fixtures when backend calls fail.

---

## 3. Backend Architecture & Endpoints

### Go Gateway Endpoints (`services/gateway/internal/http/router.go:669-689`)
The Go Gateway exposes authoritative marketplace HTTP endpoints backed by `MemoryMarketplaceStore` and `MarketplaceService`:

| Method | Route | Controller Handler | Storage Method |
|---|---|---|---|
| `GET` | `/api/marketplace/health` | `HandleHealth` | Computes live store statistics |
| `GET` | `/api/marketplace/listings` | `HandleListings` | `store.SearchListings` |
| `GET` | `/api/marketplace/listings/{id}` | `HandleListingDetail` | `store.GetListing` |
| `GET` | `/api/marketplace/opportunities` | `HandleOpportunities` | `store.ListOpportunities` |
| `GET` | `/api/marketplace/opportunities/{id}` | `HandleOpportunityDetail` | `store.GetOpportunity` |
| `POST` | `/api/marketplace/opportunities/{id}/match` | `HandleOpportunityDetail` | `svc.MatchOpportunity` |
| `POST` | `/api/marketplace/opportunities/{id}/award` | `HandleOpportunityDetail` | `svc.AwardOpportunity` |
| `GET` | `/api/marketplace/agents/{id}` | `HandleAgentProfile` | `svc.GetAgentTrustModel` |
| `GET` | `/api/marketplace/agents/{id}/performance` | `HandleAgentProfile` | `svc.GetProviderPerformance` |
| `GET` | `/api/marketplace/compare` | `HandleCompare` | `svc.CompareProviders` |
| `POST` | `/api/marketplace/simulate` | `HandleSimulate` | `svc.SimulateMarketplace` |

---

## 4. Authoritative Fixture Data vs Frontend Mocks

### Backend Authoritative Fixtures (`services/gateway/internal/marketplace/storage.go`)
- **Opportunity:**
  - `OpportunityID`: `"opp_live_01"` *(Misleading naming: indicates "live" when in fact it is seed fixture data)*
  - `RequesterID`: `"agent_research_01"`
  - `Capability`: `"code_audit"`
  - `Title`: `"Audit Protocol Gateway Handlers"`
  - `BudgetConstraintUSDC`: `"100.00"`
  - `Status`: `"OPEN"`
  - `Requirements`: `{"depth": "comprehensive", "fuzz_rounds": 1000}`
- **Listings:**
  1. `listing_code_audit_01`: `agent_security_02` | `code_audit` | $75.00 USDC | Latency: 300ms | Verification: `INDEPENDENT_VERIFIER_CONSENSUS`
  2. `listing_market_intel_02`: `agent_research_01` | `market_research` | $45.00 USDC | Latency: 120ms | Verification: `CRYPTO_HASH_AND_SCHEMA`
  3. `listing_verification_03`: `agent_verifier_03` | `result_verification` | $10.00 USDC | Latency: 30ms | Verification: `MULTI_PARTY_SIGNATURE`
- **Health:**
  - Active Providers: 3
  - Active Listings: 3
  - Open Opportunities: 1
  - Median Quote Count: 3

### Frontend Mock Fixture Mismatch (`apps/web/src/lib/api/marketplace.ts`)
Prior to this task, the fallback fixtures in `marketplace.ts` used a completely different dataset:
- Health claimed: `active_providers: 32`, `active_listings: 84`, `open_opportunities: 8`, `contracts_active: 14`, `work_being_executed: 9`.
- Opportunity claimed: `opp_sec_audit_10k` ("Analyze 10,000 smart contract telemetry events", $50.00) and `opp_market_intel_live` ($25.00).
- Listings claimed: `agent_security_alpha` ($40), `agent_intel_pro` ($12.50), `agent_auditor_beta` ($45).
- Link on `/marketplace`: Hardcoded `Primary Opportunity →` to `/marketplace/opportunities/opp_sec_audit_10k`, which broke when connected to the live backend because the backend returns `opp_live_01`.

---

## 5. Identified Deficiencies & Semantic Issues

1. **Misleading Opportunity ID (`opp_live_01`):**
   - The seed fixture uses the prefix `opp_live_01`, violating truthfulness since live execution is disabled and no live blockchain deployment exists.
2. **Missing Metric Data Provenance:**
   - Numbers like "Contracts Active: 14", "Work Executing: 9", and "Disputes: 0 (0.0%)" lacked explicit provenance tags (SIMULATED vs PROJECTED).
3. **Frontend Category Filtering Bug:**
   - `/marketplace` filtered listings using `l.capability_id.includes(filterCap)` with `filterCap = 'sec'` and `filterCap = 'data'`.
   - The backend listings use `code_audit`, `market_research`, and `result_verification`.
   - Neither contains `'sec'` or `'data'`, resulting in zero listings shown when users clicked "Security" or "Data Intel".
4. **Security Anomaly Center Button Misrepresentation:**
   - The header button featured an ominous red dot labeled `"SECURITY ANOMALY CENTER"`, implying an active production breach rather than an informational security invariants testing ground.
5. **Simulated Award vs Settlement Distinction:**
   - In `/marketplace/opportunities/[id]`, line 199 stated `"Settles on Arc via AgentVault"`.
   - In `/demo/marketplace`, step 8 claimed `"status: 'CONFIRMED_ON_ARC'"` and `"45.00 USDC on Arc via AgentVault"`.
   - Since live execution is disabled, AgentVault is not deployed, and funds are not moved, these claims violated system truthfulness.
6. **Matching & Award Safety:**
   - The UI must make it completely transparent that awarding an opportunity creates a `SIMULATED CONTRACT`, does NOT trigger on-chain broadcast, does NOT mutate AgentVault, and does NOT transfer funds.

---

## 6. Target Architecture & Provenance Matrix

| Surface | Displayed Value | Provenance Classification | Action Required |
|---|---|---|---|
| Main Banner | `Autonomous Economic Marketplace` | `SIMULATION FIXTURE` | Retain prominent badge |
| Opportunity ID | `opp_sim_01` / `opp_live_01` | `DEMO OPPORTUNITY` | Rename fixture to `opp_sim_01` (support alias) & display `DEMO OPPORTUNITY` |
| Open Opportunities | `1` | `SIMULATED` | Add explicit provenance label |
| Active Providers | `3` | `DEMO AGENTS` | Add explicit provenance label |
| Active Listings | `3` | `SIMULATED` | Add explicit provenance label |
| Quotes Pending | `6` (Median 3) | `SIMULATED` | Add explicit provenance label |
| Contracts Active | `1` | `SIMULATED` | Show simulated provenance |
| Work Executing | `1` | `SIMULATED` | Show simulated provenance |
| Disputes | `0 (0.0%)` | `PROJECTED` | Show projected provenance |
| Opportunity Budget | `$100.00 USDC` | `SIMULATED USDC` | Explicit non-custodial demo label |
| Opportunity Deadline | `10/1/2026` | `DEMO DEADLINE` | Provenance-safe label |
| Category Filters | Security / Data Intel | Deterministic mapping | Fix matching logic for `code_audit`, `market_research`, `result_verification` |
| Award Action | Match & Award | `SIMULATED AWARD` | Display `SIMULATED AWARD — NO FUNDS MOVED` |
| Demo Lifecycle Step 8 | Settlement | `SIMULATED CLEARING` | Replace `CONFIRMED_ON_ARC` with `SIMULATED_PRECLEARED (Unbroadcast)` |
| Security Anomaly Center | Invariant Test Lab | `SIMULATED ANOMALIES` | Clarify label & neutral status indicator |
