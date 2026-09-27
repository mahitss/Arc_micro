# AgentPay Control Tower 2.0 — Autonomous Economic Operating System

## 1. Executive Summary & Core Product Mission

AgentPay Control Tower 2.0 transforms the AgentPay web console into a premium, production-grade **Autonomous Economic Operating System**. It provides operators with comprehensive real-time visibility, simulation controls, and governance oversight over autonomous AI agents interacting with financial markets.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CORE PRODUCT MESSAGE                          │
│                                                                        │
│                      AI REQUESTS.                                      │
│                      AGENTPAY CONTROLS.                                │
│                      ARC SETTLES.                                      │
│                                                                        │
│              AUTONOMY CAN EXPAND. FINANCIAL AUTHORITY CANNOT.          │
└────────────────────────────────────────────────────────────────────────┘
```

Within 5 seconds of opening `/control`, an operator understands **what is happening**.  
Within 15 seconds, they understand **why it is happening**.  
Within 30 seconds, they see **who is spending what**.  
Within 45 seconds, they see **what AgentPay allowed or blocked**.  
Within 60 seconds, they see **how Arc settles transactions**.

---

## 2. Global Visual Language & Token System

The design reflects an institutional financial control system: dark, restrained, precise, and devoid of distracting gamer aesthetics, excessive glassmorphism, or non-functional gradients.

### Canonical Color Palette
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Background** | `#080808` | Deep matte canvas |
| **Primary Surface** | `#101010` | Main cards, panels, and tables |
| **Secondary Surface**| `#141414` | Nested containers and secondary sections |
| **Elevated Surface** | `#181818` | Hover states, active navigation, inspector drawers |
| **Border** | `#222222` | Standard container outlines |
| **Strong Border** | `#2B2B2B` | Highlighted cards and modal dividers |
| **Primary Text** | `#F2F0EA` | High-contrast body, titles, and values |
| **Secondary Text** | `#B0ADA5` | Subtitles and explanatory text |
| **Muted Text** | `#716F69` | Metadata labels and timestamps |
| **Primary Accent** | `#D6A83A` | AgentPay signature Amber brand accent |
| **Success** | `#2FB36F` | Status indicators and verified balances |
| **Warning** | `#D6A83A` | Alerts, simulation flags, and pending actions |
| **Danger** | `#D85C5C` | Blocked operations and critical alarms |
| **Info** | `#6B8FD6` | Subdued informative links |

### Typography Hierarchy
- **Page Titles**: `24–32px`, font-bold, tracking-tight, sans-serif.
- **Section Titles**: `15–18px`, font-semibold, sans-serif.
- **Body Text**: `13–14px`, line-height 1.5, sans-serif.
- **Metadata**: `11–12px`, text-[#716F69], sans-serif.
- **Monospace Boundary**: Monospace (`font-mono`) is strictly confined to: transaction hashes, wallet addresses, object IDs, chain IDs, timestamps, technical state, policy hashes, and correlation IDs.

---

## 3. Global Shell Architecture

The global layout consists of a persistent, unified two-tier structure:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ AgentPay   ECONOMIC CONTROL PLANE       [SIMULATION — NO FUNDS MOVED]   ARC ●   AI ●   OP │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ CONTROL      │                                                                         │
│ Overview     │                                                                         │
│ Missions     │                                                                         │
│ Activity     │                                                                         │
│              │                                                                         │
│ ECONOMY      │                                                                         │
│ Agents       │                                                                         │
│ Marketplace  │                                                                         │
│ Negotiation  │                           MAIN WORKSPACE                                │
│ Clearing     │                     (/control, /missions, /treasury, etc.)              │
│ Treasury     │                                                                         │
│              │                                                                         │
│ INTELLIGENCE │                                                                         │
│ Intelligence │                                                                         │
│ Simulator    │                                                                         │
│ AI Providers │                                                                         │
│              │                                                                         │
│ SECURITY     │                                                                         │
│ Constitution │                                                                         │
│ Approvals    │                                                                         │
│ Security     │                                                                         │
│ Incidents    │                                                                         │
│              │                                                                         │
│ INFRA        │                                                                         │
│ Operations   │                                                                         │
│ Runtime      │                                                                         │
│ Protocol     │                                                                         │
│ Arc          │                                                                         │
│              │                                                                         │
│ Settings     │                                                                         │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Compact Global Top Bar (`GlobalTopBar.tsx`)
- **Branding**: `AP` mono badge + `AgentPay \| ECONOMIC CONTROL PLANE`.
- **Command Palette Search Trigger**: Integrated `⌘K` search bar for instantaneous keyboard navigation across all subsystems.
- **Unmistakable Execution Mode**:
  - Simulation: `[SIMULATION — NO FUNDS MOVED]` in Amber badge.
  - Live: `[LIVE — REAL FUNDS]` in Red pulse badge.
- **Subsystem Status Array**: `ARC ● CONNECTED`, `AI ● CONNECTED`, `POLICY ● HEALTHY`, `RUNTIME ● HEALTHY`.

### 3.2. Canonical Sidebar Navigation (`AgentPaySidebar.tsx`)
Desktop width: ~230px, sticky, compact, persistent across all navigation.
Organized into 5 functional groups:
1. **CONTROL**: Overview (`/control`), Missions (`/missions`), Activity (`/activity`).
2. **ECONOMY**: Agents (`/agents`), Marketplace (`/marketplace`), Negotiation (`/economy/netting`), Clearing (`/economy/clearing`), Treasury (`/treasury`).
3. **INTELLIGENCE**: Intelligence (`/intelligence`), Simulator (`/simulator`), AI Providers (`/settings/ai`).
4. **SECURITY**: Constitution (`/constitution`), Approvals (`/approvals`), Security (`/security`), Incidents (`/incidents`).
5. **INFRASTRUCTURE**: Operations (`/control/operations`), Runtime (`/control/runtime`), Protocol (`/control/protocol`), Arc (`/arc`).
- **Footer**: Pinned status check for Arc, AI, Policy, and Runtime, plus direct link to `/settings`.

---

## 4. Flagship Control Tower (`/control`) Signature Panels

The flagship operating system screen organizes all core information into 12 signature panels:

1. **Control Tower Hero**:
   Displays product thesis, simulation disclaimer, environment parameters, and immediate reset demo controls.
2. **Compact System Status Strip**:
   8 real-time metrics with verified provenance tags: Missions (12), Active Agents (37), Committed ($182.40), At Risk ($24.10), Pending Approval (3), Running Workflows (8), Settled ($1,204.32), Arc Mainnet (Connected).
3. **AI vs Financial Authority Separation**:
   Visual architecture contrasting the AI Advisory Domain (Plan, Recommend, Negotiate, Replan) with the AgentPay Control Layer (Policy, Risk, Budget, Approval, Treasury, Execution Gate) and Arc (On-Chain Settlement).
4. **Financial Authority Pipeline**:
   Concise 9-stage progression illustrating how a $25.00 AI request is vetted, policy-checked, risk-scored, encumbered, and authorized.
5. **Live Economic Timeline (Visual Centerpiece)**:
   14 canonical lifecycle steps (Objective Created $\to$ Plan Generated $\to$ Services Discovered $\to$ Quotes Received $\to$ Provider Selected $\to$ Policy Check $\to$ Risk Check $\to$ Approval $\to$ Treasury Reservation $\to$ Execution $\to$ Provider Failure $\to$ Replanning $\to$ Arc Settlement $\to$ Evaluation & Result).
6. **WHY / WHY NOT Panel**:
   Deterministic system evidence answering why a provider was selected (lowest expected cost, 99.4% historical completion rate, policy verified) and why alternative candidates were rejected (exceeded budget cap, higher latency).
7. **Blocked Actions ("Blocked by AgentPay")**:
   Interactive forensic laboratory demonstrating 8 blocked attacks: Recipient substitution, Budget escalation, Arbitrary calldata, Policy modification, Quote invalidation, Nonce replay, Duplicate settlement, and Forged completion.
8. **Active Autonomous Missions**:
   Mission cards with objective description, progress bar, spent vs remaining budget, and risk rating.
9. **Economic Agent Topology**:
   Interactive graph visualizing relationships among Agents, Services, Missions, Treasury locks, and Arc settlement.
10. **Treasury & Liquidity Buffer**:
    Breakdown of Available ($81.50), Committed ($12.50), Reserved ($14.00), At Risk ($0.00), and Settled ($1,204.32), featuring an 86.4% solvency health bar.
11. **Arc Settlement Truth Matrix**:
    Truthful on-chain report: Chain 5042 connected, native USDC verified, AgentVault undeployed on Mainnet, live broadcasts operator-gated, 0 fabricated transactions.
12. **Universal Inspector Drawer**:
    Slide-over inspection drawer for examining any event, mission, decision, or entity without navigating away.

---

## 5. Universal Capabilities & New Features

### 5.1. Universal Inspector (`AgentPayInspector.tsx`)
A slide-over contextual drawer that renders:
- **Identity & Status**: Type, ID, human-readable title, provenance badge.
- **Deterministic Decision**: Evaluated rule, latency in microseconds, outcome, and explanation.
- **Financial Breakdown**: Requested vs authorized amounts, budget ceiling, and encumbrance.
- **Connected Entities & Causal Audit Trail**: Step-by-step history with actor attribution.

### 5.2. Global Command Palette (`AgentPayCommandPalette.tsx`)
Keyboard shortcut: `⌘K` / `Ctrl+K`.  
Enables instant search and navigation across missions, agents, treasury, clearing, simulator, security lab, incidents, and AI settings.

### 5.3. Dedicated Autonomous Incident Center (`/incidents`)
Features first-class observability of autonomous fault tolerance:
- Active incidents with severity badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- Autonomous mitigation details (lease fencing, provider failover, replanning).
- Deterministic containment proofs demonstrating $0.00 financial leakage.

---

## 6. Data Provenance & Truthfulness Invariants

Every financial metric, transaction hash, and address in Control Tower 2.0 is assigned a strict provenance tag:

| Tag | Meaning | Enforcement Rule |
| :--- | :--- | :--- |
| **`LIVE`** | Live telemetry fetched from active gateway daemon | Verified via HTTP health endpoints |
| **`VERIFIED`** | Cryptographically verified on-chain state or receipt | EIP-155 / RPC verified block data |
| **`PROJECTED`** | Calculated estimate or simulation model | Explicitly marked in simulation mode |
| **`SIMULATED`** | Generated by digital twin Monte Carlo engine | Zero on-chain broadcast capability |
| **`CACHED`** | Offline fallback data | Timestamped with cache age |
| **`UNAVAILABLE`** | Subsystem unreachable or offline | Fails closed with retry controls |

---

## 7. Verification & Quality Assurance

- **Design System Primitives**: All components implemented in `apps/web/src/components/ui/`.
- **Next.js Production Build**: `npm run build` compiles with 0 errors across all 77 routes.
- **Go Gateway Backend**: All 20 security invariants, AI telemetry routes, and full test suite pass cleanly (`go test ./...` exit code 0).
- **Responsive Layout**: Validated across desktop (1920x1080, 1440x900, 1366x768), tablet (1024x768, 768x1024), and mobile viewports.
