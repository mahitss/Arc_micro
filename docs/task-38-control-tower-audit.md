# Task 38: AgentPay Control Tower 2.0 — Architectural & Visual Audit

**Document Status**: Final Audit Completed  
**System Target**: Premium Autonomous Economic Operating System  
**Core Product Message**:  
> **AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.**  
> *Autonomy can expand. Financial authority cannot.*

---

## 1. Executive Summary

This audit assesses the state of `apps/web/` prior to the implementation of **Control Tower 2.0**. The existing web console features extensive capabilities (Control Tower, Missions, Swarms, Marketplace, Network, Treasury, Clearinghouse, Simulator, Security Lab, Arc Explorer, AI Settings), but suffers from structural fragmentation, duplicated navigation and status badges, inconsistent color tokens and typography, mixed monospace usage, and lack of a unified universal inspector and command palette.

The goal of Task 38 is **not** to rewrite existing backend functionality, but to elevate the interface into a coherent, authoritative, institutional financial command center.

---

## 2. Shell & Layout Audit

| Element | Current Implementation | Identified Problems | Target State in Control Tower 2.0 |
| :--- | :--- | :--- | :--- |
| **Global Header** (`layout.tsx`) | Renders `AP` logo, `HeaderNav` (currently hidden with `className="hidden"`), and `SystemStatusBanner`. | Header navigation is dead code. Header branding duplicates the sidebar branding immediately below it. | Clean, compact top bar: `AgentPay \| ECONOMIC CONTROL PLANE`, persistent mode badge (`SIMULATION — NO FUNDS MOVED` / `LIVE — REAL FUNDS`), subsystem health indicators (`ARC ●`, `AI ●`, `POLICY ●`, `RUNTIME ●`), command palette trigger (`⌘K`), and user controls. |
| **Command Rail / Sidebar** (`AgentPaySidebar.tsx`) | Groups items under `PRIMARY`, `OPERATIONS`, `FINANCIAL`, `TOOLS`. Uses `font-mono` on all navigation items. | Non-standard navigation grouping; monospace used improperly on normal navigation text; duplicate branding; footer duplicates status indicators. | Canonical ~230px persistent sidebar with 5 clean functional groups: `CONTROL`, `ECONOMY`, `INTELLIGENCE`, `SECURITY`, `INFRASTRUCTURE`, plus pinned system status and settings. Legible modern sans-serif. |
| **Main Content Container** (`AgentPayShell.tsx`) | `<main className="min-w-0 flex-1 w-full p-4 sm:p-6 lg:px-8 lg:py-6 overflow-x-hidden">` | Functional, but individual pages re-implement inconsistent container max-widths (`max-w-7xl`, `max-w-[1440px]`, `w-full`). | Standardized workspace layout with consistent max-width (`max-w-[1536px]` or `max-w-7xl`), unified padding, and persistent sidebar across all routes. |

---

## 3. Visual Language & Token Consistency Audit

### 3.1. Color System
- **Current Findings**:
  - CSS variables define `--ap-bg: #080808`, `--ap-surface: #101010`, etc.
  - Across pages, hardcoded colors appear: `#0A0A0A`, `#0B0B0B`, `#0f0f0f`, `#111111`, `#121212`, `#141414`, `#151515`, `#181818`, `#1a1a1a`, `#202020`, `#222222`, `#242424`, `#262626`, `#2B2B2B`, `#2D2D2D`.
  - Non-canonical accents (cyan, purple, emerald, tailwind blues) exist in various status cards and badges.
- **Task 38 Canonical Palette**:
  - `Background`: `#080808`
  - `Primary surface`: `#101010`
  - `Secondary surface`: `#141414`
  - `Elevated surface`: `#181818`
  - `Borders`: `#222222`
  - `Strong borders`: `#2B2B2B`
  - `Primary text`: `#F2F0EA`
  - `Secondary text`: `#B0ADA5`
  - `Muted text`: `#716F69`
  - `Primary accent`: `#D6A83A` (Amber)
  - `Success`: `#2FB36F` (Green)
  - `Warning`: `#D6A83A` (Amber)
  - `Danger`: `#D85C5C` (Red)
  - `Info`: `#6B8FD6` (Subdued Blue)

### 3.2. Typography & Monospace Boundaries
- **Current Findings**:
  - `AgentPaySidebar.tsx` renders all menu items in `font-mono text-xs`.
  - Several page headings and descriptions mix monospace with sans-serif inconsistently.
- **Task 38 Rule**:
  - Monospace is strictly reserved for: transaction hashes, addresses, IDs, chain IDs, event IDs, timestamps, technical state, policy hashes, and correlation IDs.
  - Normal UI typography must use clean modern sans-serif:
    - Page Title: `24–32px`, font-bold, tracking-tight
    - Section Title: `15–18px`, font-semibold
    - Body: `13–14px`, text-[#F2F0EA] / text-[#B0ADA5]
    - Metadata: `11–12px`, text-[#716F69]

### 3.3. Card & Border Radius Consistency
- **Current Findings**:
  - Cards inconsistently use `rounded-md`, `rounded-lg`, `rounded-xl`, and `rounded-2xl`.
  - Shadows vary from `shadow-none`, `shadow-sm`, to custom box-shadows.
- **Task 38 Rule**:
  - Standardize on `rounded-lg` (8px) for buttons, inputs, and small badges.
  - Standardize on `rounded-xl` (12px) for primary cards and panels.
  - Minimal flat elevation with subtle borders (`border-[#222222]`), zero glossy gradients or neon glow.

---

## 4. Status & Triplication Audit

A critical issue identified is **status triplication**:
1. **Top Header**: `SystemStatusBanner` shows `GATEWAY ONLINE`, `ENV DEV-SANDBOX`, `ORG DEFAULT`, `ARC SIMULATION · 5042`.
2. **Sidebar Footer**: Shows `GATEWAY ONLINE`, `ARC SIMULATION · 5042`, `LIVE EXECUTION DISABLED`, `AGENTVAULT NOT DEPLOYED`.
3. **Control Tower Hero**: Shows `MODE: SIMULATION`, `ARC: CONNECTED (5042)`, `VAULT: NOT DEPLOYED`, `EXECUTION: DISABLED`, `REAL SETTLEMENTS: 0 VERIFIED`.

**Resolution**:
- Unify global status in the top bar: Mode (`SIMULATION — NO FUNDS MOVED`), `ARC ● CONNECTED`, `AI ● CONNECTED`, `POLICY ● HEALTHY`, `RUNTIME ● HEALTHY`.
- Keep the sidebar footer compact and clean.
- In `/control`, focus the hero strip on **aggregate economic operations**: Missions Count, Active Agents, Committed Capital, At Risk, Pending Approvals, Running Workflows, Settled Volume, and Arc Connectivity.

---

## 5. Data Truthfulness & Provenance Audit

| Route | Data Source | Provenance Status | Invariant Check |
| :--- | :--- | :--- | :--- |
| `/control` | `fetchControlOverview`, `fetchControlActivity`, `fetchFinancialTrace` | Live Gateway when online; deterministic simulation fixture when offline. | **TRUE**: Clearly displays `SIMULATION` and `0 VERIFIED SETTLEMENTS`. |
| `/missions` | `fetchMissions`, `simulateMission`, `createMission` | Live Gateway REST API. | **TRUE**: Amounts in atomic micro-USDC converted accurately. |
| `/missions/[id]` | `fetchMission`, `fetchMissionTrace`, `fetchMissionIntelligence` | Live Gateway + intelligence service. | **TRUE**: Simulation traces are clearly denoted. |
| `/marketplace` | `getListings`, `getOpportunities`, `getMarketplaceHealth` | Mock fixture with live fallback. | **LABEL REQUIRED**: Explicitly tag as `SIMULATION FIXTURE`. |
| `/network` | `fetchNetworkAgents`, `fetchContracts`, `fetchNetworkGraph` | REST API with seed directory. | **LABEL REQUIRED**: Tag directory nodes as `LOCAL SIMULATION`. |
| `/economy/clearing` | `fetchObligations`, `fetchBatches` | Live Gateway double-entry ledger. | **TRUE**: Displays bilateral clearing state. |
| `/treasury` | `fetchTreasuryState`, `fetchTreasuryReservations` | Live Gateway treasury service. | **TRUE**: Supports `REAL` vs `SIMULATION` mode toggle. |
| `/simulator` | `createSimulation`, `runMonteCarlo`, `runCounterfactual` | Digital Twin Monte Carlo engine. | **TRUE**: Strictly marked `SIMULATION`. |
| `/security` | `fetchSecurityReport` | Invariants and policy report. | **TRUE**: Subsystem status checks. |
| `/arc` | Arc Mainnet RPC JSON-RPC (`rpc.mainnet.arc.io`) | Live on-chain RPC probe. | **EXEMPLARY**: Accurately shows AgentVault is `NOT DEPLOYED ON MAINNET` and broadcasts are operator-gated. |
| `/settings/ai` | `/api/ai/telemetry`, `/api/ai/models`, `/api/ai/prompts` | Live Go AI provider layer. | **TRUE**: Live provider telemetry and routing table. |

---

## 6. Page-by-Page Requirements for Control Tower 2.0

### 6.1. `/control` (Flagship Operating System Screen)
- **Status Strip**: Missions (12), Active Agents (37), Committed ($182.40), At Risk ($24.10), Pending Approval (3), Running Workflows (8), Settled ($1,204.32), Arc (Connected).
- **Live Economic Timeline**: Event stream with 14 canonical steps (Objective Created $\to$ Plan Generated $\to$ Discovery $\to$ Quotes $\to$ Selected $\to$ Policy Check $\to$ Risk Check $\to$ Approval $\to$ Treasury Reservation $\to$ Execution $\to$ Arc Settlement $\to$ Result $\to$ Evaluation $\to$ Replan).
- **WHY / WHY NOT Panel**: Deterministic evidence explaining why an agent or provider was selected, and why candidates were rejected (exceeds budget, unallowlisted, latency).
- **AI VS AUTHORITY Panel**: Clear visual separation: AI Advisory Domain (Plan, Recommend, Negotiate, Replan) vs AgentPay Control Plane (Policy, Risk, Approval, Treasury, Execution Gate) vs Arc (Settlement).
- **FINANCIAL AUTHORITY Panel**: Concise 5-second walkthrough: AI Requested ($25.00) $\to$ Mission Budget ($25.00) $\to$ Policy Limit ($50.00) $\to$ Risk (Low) $\to$ Approval (Not Required) $\to$ Treasury Reserved ($25.00) $\to$ Authorized ($25.00) $\to$ Recipient (Verified) $\to$ Execution (Allowed).
- **BLOCKED BY AGENTPAY Section**: 8 interactive deterministic attack scenarios (Recipient substitution, Budget escalation, Policy modification, Arbitrary calldata, Quote invalidation, Nonce replay, Duplicate settlement, Forged completion).
- **Active Missions Cards**: Real mission cards with budget, spent, remaining, steps, and risk level.
- **Treasury / Liquidity Visualization**: Available, Committed, Reserved, At Risk, Settled with liquidity bar, clearly labeled `PROJECTED` vs `VERIFIED ON-CHAIN`.
- **Arc Panel**: Honest status card (Chain 5042, RPC connected, Native USDC verified, AgentVault undeployed, broadcasts operator-gated).

### 6.2. New Dedicated Routes & Features
1. **Universal Inspector Drawer** (`AgentPayInspector`): Contextual drawer to inspect any Mission, Agent, Service, Payment, Policy Decision, Approval, Transaction, or AI Proposal without navigating away.
2. **Command Palette** (`AgentPayCommandPalette`): Accessible via `Cmd+K` / `Ctrl+K`, enabling keyboard-driven navigation across Control Tower, Treasury, Clearing, Missions, Simulator, Security, and Arc.
3. **Dedicated Incident Center** (`/incidents`): Display active incidents, autonomous recovery actions, and resolved incidents.
4. **Design System Components** (`src/components/ui/`): Canonical components (`AgentPayCard`, `AgentPayBadge`, `AgentPayMetric`, `AgentPayPanel`, `AgentPayTable`, `AgentPayTimeline`, `AgentPayStatus`, `AgentPayEmptyState`, `AgentPaySkeleton`).

---

## 7. Audit Conclusion & Execution Plan

The existing foundation is robust, with rich data structures and working backend integrations. Task 38 will streamline this into a single, cohesive, premium Autonomous Economic Operating System without breaking any existing functionality or touching financial boundaries.

**Next Steps**:
1. Implement canonical design system primitives in `src/components/ui/`.
2. Refactor `layout.tsx`, `HeaderNav.tsx`, and `AgentPaySidebar.tsx` into the unified shell and sidebar.
3. Implement `AgentPayCommandPalette` and `AgentPayInspector`.
4. Create `/incidents/page.tsx`.
5. Upgrade `/control/page.tsx` with all 12 signature panels and live economic timeline.
6. Verify responsive layouts, run `npm test` and `npm run build`.
7. Generate documentation in `docs/task-38-control-tower-2.md` and commit.
