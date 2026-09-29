# AgentPay — Flagship Demo Recording Checklist

This checklist establishes the pre-flight, in-flight, and post-flight operational procedures for recording the official hackathon video demonstration. Adherence to every item ensures zero cognitive friction, zero leaked secrets, and 100% defensibility.

---

## 1. Environment & Display Preparation

- [ ] **Display Resolution:** Set primary recording monitor to exact **1920x1080** (16:9 aspect ratio) at 100% desktop scaling.
- [ ] **Browser Window:** Clean Chrome / Brave window in fullscreen (F11 or maximized without bookmark bar).
- [ ] **Theme & Styling:** Verify dark theme (`#080808` matte black palette) is active with no browser extensions or developer overlays visible.
- [ ] **Tab Cleanliness:** Only two tabs open:
  - Tab 1: `http://localhost:3000/control` (Control Tower)
  - Tab 2: `http://localhost:3000/missions/demo/replay` (Flagship Mission Replay)
- [ ] **Terminal Cleanliness:**
  - Font size readable (16pt–18pt).
  - Clear history (`clear` or `cls`).
  - Ensure zero visible environment variables, AWS keys, or RPC private keys.
- [ ] **Audio & Microphone:**
  - Dedicated microphone tested with noise suppression.
  - Verify zero clipping, echo, or background fan noise.

---

## 2. System State & Truthfulness Verification

- [ ] **Mode Badges:** Confirm `SIMULATION — NO FUNDS MOVED` is visibly displayed on all screens.
- [ ] **Arc Truth Status:** Confirm Arc banner states:
  - `ARC CHAIN: 5042`
  - `AGENTVAULT: NOT DEPLOYED`
  - `REAL SETTLEMENTS: 0 VERIFIED`
  - `BROADCAST: NONE`
- [ ] **AI Provider:** Confirm OpenRouter advisory routing is active with read-only tool contracts.
- [ ] **Demo State Reset:** Click **⏮ Reset** on the replay controller or execute:
  ```bash
  node packages/cli/dist/src/index.js demo mission --reset
  ```
  Verify the timeline resets cleanly to Step 1 of 22 (Progress 0%).

---

## 3. Timed Rehearsal Walkthrough (Target: 4m 45s)

| Time | Target Screen | Action / Narration Focus | Key Visual Anchor |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:20** | Control Tower (`/control`) | **Hook & Problem:** Autonomous AI agents are reasoning and delegating, but giving them raw wallets creates an unacceptable corporate risk surface. | Hero Headline & `AI REQUESTS. AGENTPAY CONTROLS. ARC SETTLES.` |
| **0:20 – 0:40** | Control Tower (`/control`) | **Solution:** AgentPay decouples cognitive intelligence from financial authority. | `AI VS AUTHORITY SEPARATION` 3-column panel |
| **0:40 – 1:00** | Control Tower (`/control`) | **Control Surface:** Show healthy double-entry ledger, active invariants, and truthful Arc L1 connection. | System status strip (`Chain 5042`, `SIMULATION`) |
| **1:00 – 1:40** | Mission Replay (`/missions/demo/replay`) | **Mission Launch & Swarm Planning:** Start 22-step playback. AI decomposes objective; marketplace discovers 4 candidate providers. | Step 1–5 progression, quote comparison |
| **1:40 – 2:20** | Mission Replay (Step 8–11) | **Deterministic Policy & Treasury:** Rust policy evaluates in 6.36µs; treasury locks atomic liquidity reservation. | Step 8 Policy ALLOW badge & Treasury reservation |
| **2:20 – 2:45** | Mission Replay (Step 12–13) | **THE ATTACK (Security Moment):** Rogue provider attempts recipient substitution to `0xdead...beef`. AgentPay triggers `HARD_DENY`. Highlight **FUNDS MOVED: $0.00**. | Red Alert Box: `HARD DENY (INV-186) - FUNDS MOVED: 0.00 USDC` |
| **2:45 – 3:20** | Mission Replay (Step 14–16) | **THE FAILURE & REPLAN:** Legitimate Provider B times out. Worker fenced. AI autonomously swaps to Provider C (+$0.90). AgentPay revalidates envelope. | Gold Alert Box: `AUTONOMOUS FAILURE FENCING & CONTROLLED REPLAN` |
| **3:20 – 3:45** | Mission Replay (Step 18–19) | **Validation & Deliverable:** Critic agent evaluates quality (94/100). SLA deliverable hash validated. | Critic PASS badge, payload hash verified |
| **3:45 – 4:10** | Mission Replay (Step 20–21) | **Clearing & Settlement:** Bilateral clearing recorded; projected Arc settlement. Unencumbered $16.50 returned to treasury. | Clearing breakdown table & Arc simulation badge |
| **4:10 – 4:30** | Arc Panel (`/arc`) | **Truthful Arc Consensus:** Truth disclosure: Connected to Chain 5042, native USDC verified, AgentVault undeployed, 0 real broadcasts. | 7-card settlement status strip (`NOT DEPLOYED`, `0 VERIFIED`) |
| **4:30 – 4:45** | Final Slide / Replay Header | **Closing Statement:** "AI can change the plan. AgentPay controls the power. Arc settles authorized value." | Final Economic Summary: Budget $25.00, Authorized $8.50, Blocked $3.60 |

---

## 4. Post-Recording Quality Control

- [ ] **Frame Check:** No visual glitches, cursor jumps, or dropped frames during playback transitions.
- [ ] **Audio Clarity:** Voiceover syncs accurately with screen actions.
- [ ] **Claim Audit:** Zero spoken or visual claims of "live funds moved" or "mainnet deployed".
- [ ] **Terminal Secrets:** Zero private keys, auth tokens, or absolute filesystem paths exposed in terminal recordings.
- [ ] **Export:** Video rendered to 1080p MP4 / WebM, 30fps/60fps, under 250MB for portal upload.
