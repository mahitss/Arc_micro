# AgentPay v1.0 — Flagship Demo Script (Submission)
**Scenario:** Autonomous Market Mission  
**Duration:** 3–5 Minutes  

---

## Demo Summary
Demonstrates a multi-agent autonomous mission:
1. **User Objective**: *"Research the cheapest reliable AI inference provider, analyze three sources, hire a summarization agent, and complete the report within a $5.00 USDC budget."*
2. **Simulation**: Projects expected cost ($0.85 USDC) and worst-case exposure ($1.40 USDC) using Monte Carlo modeling.
3. **Marketplace Matching**: Discovers providers and deterministically selects the optimal candidate.
4. **Resilience**: Simulates provider failure; runtime detects drop-out and automatically replans with a backup provider.
5. **Execution Gate**: Rust policy core evaluates payment in 6.36 µs; treasury reserves liquidity.
6. **Settlement**: Mined on Arc Mainnet (or executed in deterministic simulation).
7. **Control Tower**: Causal trace graph rendered live at `/control` or `/trace`.
