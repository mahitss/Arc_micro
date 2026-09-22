# AgentPay Autonomous Mission Control Center — Frontend Architecture

## 1. Overview & Vision

The **AgentPay Autonomous Mission Control Center** serves as the primary visual operations dashboard for autonomous AI agents executing financial objectives.

It is designed with an infrastructure-first, command-center aesthetic:
- **Core Paradigm**: "An autonomous agent is operating inside an economy, but AgentPay deterministically controls the money."
- **Visual Progression**: Objective $\to$ Autonomous Mission $\to$ Agents $\to$ Service Marketplace $\to$ Economic Decisions $\to$ Policy / Risk $\to$ Payments $\to$ Arc Settlement $\to$ Results $\to$ Completion.
- **Strict Realism Guarantee**: Real backend state is the single source of truth. The frontend does not fabricate transactions, mock Arc hashes, or render fake financial data. If backend telemetry is unavailable, it explicitly displays `DATA UNAVAILABLE` or `NOT CONNECTED`.

---

## 2. Route Map & Screen Responsibilities

| Route | Title | Key Responsibilities |
| :--- | :--- | :--- |
| `/` or `/overview` | **Command Center Overview** | Executive summary, active missions counter, volume, approval queue, policy blocks, success rates, primary CTAs (`CREATE MISSION`, `SIMULATE MISSION`). |
| `/missions` | **Missions Roster** | Filterable list of all active/completed missions, budget utilization meters, status badges, quick actions. |
| `/missions/new` | **Mission Inception** | Autonomous mission form: objective, budget ceiling, agent selection, allowed categories, simulation vs live mode toggle. |
| `/missions/[id]` | **Mission Command Center (Hero Screen)** | Live operational view: mission economics, autonomous activity stream, service decision matrix, canonical payment panel, sanitized untrusted result panel, and visual timeline. |
| `/marketplace` | **Service Marketplace** | Searchable directory of external services and peer AI agents with capabilities, pricing, trust status, and reputation. |
| `/marketplace/[id]` | **Service Profile & Quote** | Provider deep dive, historical latency, success rate, authoritative recipient binding, and live quote solicitation. |
| `/agents` | **Autonomous Agents** | Roster of authorized agents with status, organization, capabilities, daily limits, today's spend, and mission history. |
| `/agents/[id]` | **Agent Detail & Safety** | Agent identity, policies, recent payment intents, security events, emergency pause/resume controls. |
| `/economy` | **Economic Intelligence** | Volume charts, transaction counts, average payment, service utilization, and multi-tenant reputation leaderboard. |
| `/security` | **Security Center** | Subsystem status (Policy Engine, Risk Engine, Approvals, Treasury, Signer, Vault, Arc), security invariants table (`AI CANNOT` / `SERVICE CANNOT`). |
| `/approvals` | **Approval Center** | Pending approval queue with risk scores, policy reasons, and approve/reject actions (subordinated to hard policy DENY). |
| `/activity` | **Global Financial Activity** | Unified audit stream across missions, payments, policies, approvals, and Arc confirmations with raw payload inspection. |
| `/trace` | **Flight Recorder & Replay** | Immutable chronological trace timeline with interactive, read-only step replay animation. |

---

## 3. Component Hierarchy

```
RootLayout (apps/web/src/app/layout.tsx)
 ├── GlobalHeader (TopBar)
 │    ├── Logo & Product Identifier ("AgentPay Control Center")
 │    ├── GlobalNavLinks (Overview, Missions, Agents, Marketplace, Economy, Approvals, Activity, Security)
 │    └── SystemStatusPill (Simulation vs Arc Mainnet: Verified / Not Connected)
 ├── GlobalSubNav (Mobile responsive scroll bar)
 └── Main Content Area
      ├── PageContainer
      │    ├── CommandOverviewView (/overview)
      │    │    ├── HeroAutonomousEconomyCTA
      │    │    ├── ExecutiveMetricsGrid (Active, Spend, Approvals, Policy Blocks)
      │    │    └── MissionQuickLaunchPanel
      │    ├── MissionCreateView (/missions/new)
      │    │    ├── ObjectiveComposerForm
      │    │    ├── BudgetAndPolicyPreviewBox
      │    │    └── SimulationDryRunInspector
      │    ├── MissionCommandView (/missions/[id])
      │    │    ├── MissionHeaderBadge (AP-XXXX, Status)
      │    │    ├── VisualMissionTimeline (10-Node Flow Pipeline)
      │    │    ├── MissionEconomicsGrid (Budget, Spent, Remaining, Risk)
      │    │    ├── AutonomousActivityFeed (Event Stream)
      │    │    ├── ServiceDecisionMatrix (Candidate Comparison & Reason Codes)
      │    │    ├── CanonicalPaymentPanel (PaymentIntent & Arc Settlement)
      │    │    └── SanitizedResultPanel (Untrusted Data & Prompt Injection Alert)
      │    ├── MarketplaceDirectoryView (/marketplace & /marketplace/[id])
      │    ├── AgentsDirectoryView (/agents & /agents/[id])
      │    ├── EconomyIntelligenceView (/economy)
      │    ├── SecurityCenterView (/security)
      │    ├── ApprovalCenterView (/approvals)
      │    ├── ActivityStreamView (/activity)
      │    └── MissionReplayView (/trace)
```

---

## 4. API Dependencies & State Management

The frontend interfaces with the following backend REST endpoints:

- **System Health**: `GET /health`, `GET /ready` $\to$ `fetchSystemHealth()`
- **Missions**:
  - `POST /v1/missions` $\to$ Create mission objective
  - `GET /v1/missions` $\to$ Query mission roster
  - `GET /v1/missions/{id}` $\to$ Query mission details & steps
  - `POST /v1/missions/{id}/start` $\to$ Start autonomous loop
  - `POST /v1/missions/{id}/cancel` $\to$ Cancel active mission
  - `POST /v1/missions/simulate` $\to$ Zero-broadcast dry-run
  - `GET /v1/missions/{id}/trace` $\to$ Immutable flight trace & events
- **Marketplace & Quotes**:
  - `GET /v1/marketplace` $\to$ Discover registered services & peer agents
  - `POST /v1/services/{id}/quote` $\to$ Solicit binding quote from registry
- **Agents & Budgets**:
  - `GET /v1/agents`, `GET /v1/agents/{id}`, `GET /v1/agent-budgets/{id}`
- **Economy & Reputation**:
  - `GET /v1/economy/reputation` $\to$ Org-isolated reputation telemetry
- **Approvals & Emergency**:
  - `GET /v1/approvals`, `POST /v1/approvals/{id}/approve`, `POST /v1/approvals/{id}/reject`
  - `POST /v1/agents/{id}/pause|resume`

---

## 5. Realtime & Update Strategy

1. **Active Mission Polling**: While a mission is in an active non-terminal state (`PLANNING`, `DISCOVERING`, `EVALUATING`, `SELECTING`, `EXECUTING`, `WAITING_FOR_RESULT`), the client polls `/v1/missions/{id}` and `/v1/missions/{id}/trace` at a controlled 2.5-second interval.
2. **Exponential Backoff**: If network errors or 503s occur, polling intervals double (2.5s $\to$ 5s $\to$ 10s $\to$ 20s) up to a max ceiling of 30 seconds.
3. **Status Badges**: The top bar and page headers render explicit state indicators:
   - `● LIVE`: Active polling, gateway responding.
   - `○ STALE`: Telemetry older than 30 seconds.
   - `✕ OFFLINE / DISCONNECTED`: Gateway unreachable.

---

## 6. Error & Loading State Architecture

Every primary surface supports 7 discrete UI states:
1. **Loading State**: Monospaced skeleton loaders maintaining layout stability.
2. **Empty State**: Clear technical guidance when no entities exist (e.g. "No active missions. Launch an objective above.").
3. **Backend Unavailable State**: Prominent banner: `"AgentPay Backend Unavailable at http://localhost:8080. Start gateway with 'go run cmd/server/main.go'."`
4. **Data Unavailable State**: Renders `"DATA UNAVAILABLE"` rather than fabricated zeros.
5. **Simulation vs Live State**: Prominent amber badge `"SIMULATION MODE: No real funds or blockchain state mutated"` vs `"ARC MAINNET: Chain ID 5042"`.
6. **Policy Block State**: Red warning cards detailing explicit policy violation reason codes (`RECIPIENT_BLOCKED`, `LIMIT_EXCEEDED`, `UNAUTHORIZED_CATEGORY`).
7. **Adversarial / Security Event State**: Highlights untrusted service output with security shields and verifies that financial parameters remained unaffected.

---

## 7. Security Boundaries in Frontend

- **Zero Private Keys**: The frontend contains zero private keys, mnemonic phrases, or signing keystores.
- **Zero LocalStorage Secrets**: Authentication tokens (when configured) use secure session headers or memory; credentials are never serialized to browser storage.
- **Untrusted Output Isolation**: External service result strings are rendered inside pre-formatted sandboxes. Scripts or HTML tags inside service payloads are never evaluated.
- **Subordinated Approvals**: The UI explicitly disallows "approving" an intent that has received a hard policy `DENY`.
