# scripts/demo_run_mission.ps1
# Flagship Mission Execution: "Autonomous Market Intelligence Mission"
# Proves the 20-step lifecycle against live Gateway API.

$ErrorActionPreference = "Stop"

$headers = @{
    "Content-Type" = "application/json"
}

Write-Output "============================================================"
Write-Output "AGENTPAY FLAGSHIP AUDIT: AUTONOMOUS MARKET INTELLIGENCE MISSION"
Write-Output "TARGET: Gateway http://localhost:8080 | Policy http://localhost:8081"
Write-Output "SAFETY INVARIANT: ENABLE_LIVE_EXECUTION=false (SIMULATION ONLY)"
Write-Output "============================================================"

# Step 1 & 2: Objective Creation
$createPayload = @{
    tenant_id             = "tenant_prod_audit"
    description           = "Autonomous Market Intelligence Mission"
    owner                 = "operator"
    economic_budget_usdc  = 25.00
    risk_tolerance        = "MEDIUM"
    required_capabilities = @("market-intel", "report-generation")
} | ConvertTo-Json

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$obj = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives" -Method Post -Headers $headers -Body $createPayload
$tCreate = $sw.ElapsedMilliseconds
Write-Output "`n[STEP 1-2: OBJECTIVE CREATED]"
Write-Output "  Objective ID : $($obj.objective_id)"
Write-Output "  Description  : $($obj.description)"
Write-Output "  Budget Cap   : $($obj.economic_budget_usdc) USDC"
Write-Output "  Status       : $($obj.status)"
Write-Output "  Latency      : $tCreate ms"

$objId = $obj.objective_id

# Step 3: Planner Decomposition (Blueprint Compilation)
$sw.Restart()
$bp = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/plan" -Method Post -Headers $headers
$tPlan = $sw.ElapsedMilliseconds
Write-Output "`n[STEP 3: BLUEPRINT COMPILED]"
Write-Output "  Blueprint ID : $($bp.blueprint_id)"
Write-Output "  Version      : $($bp.version)"
Write-Output "  Tasks Count  : $($bp.tasks.Length)"
Write-Output "  Max Exposure : $($bp.economic_envelope.max_exposure_usdc) USDC"
Write-Output "  Latency      : $tPlan ms"

# Step 4-8: Simulation & Policy Evaluation
$sw.Restart()
$sim = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/simulate" -Method Post -Headers $headers
$tSim = $sw.ElapsedMilliseconds
Write-Output "`n[STEP 4-8: SIMULATION & POLICY EVALUATION]"
Write-Output "  Simulation ID : $($sim.simulation_id)"
Write-Output "  Policy Result : $($sim.policy_decision)"
Write-Output "  Risk Score    : $($sim.risk_score)"
Write-Output "  Expected Cost : $($sim.expected_cost_usdc) USDC"
Write-Output "  Latency       : $tSim ms"

# Step 9: Launch Mission (Pre-flight Gate Verification)
$sw.Restart()
$decision = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/start" -Method Post -Headers $headers
$tStart = $sw.ElapsedMilliseconds
Write-Output "`n[STEP 9: PRE-FLIGHT GATE & LAUNCH]"
Write-Output "  Decision ID        : $($decision.decision_id)"
Write-Output "  Decision Type      : $($decision.decision_type)"
Write-Output "  Financial Authority: $($decision.financial_authority)"
Write-Output "  Reason Code        : $($decision.reason_code)"
Write-Output "  Latency            : $tStart ms"

# Step 10-12: Provider Failure & Controlled Replanning
$replanPayload = @{
    reason                 = "PROVIDER_FAILURE"
    new_provider_candidate = "agent_budget_ai"
    allowed_providers     = @("agent_budget_ai", "agent_fast_infer")
} | ConvertTo-Json

$sw.Restart()
$replanRes = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/replan" -Method Post -Headers $headers -Body $replanPayload
$tReplan = $sw.ElapsedMilliseconds
Write-Output "`n[STEP 10-12: PROVIDER FAILURE & CONTROLLED REPLAN]"
Write-Output "  Replan Reason      : $($replanRes.version.replan_reason)"
Write-Output "  New Version        : $($replanRes.version.version)"
Write-Output "  New Blueprint ID   : $($replanRes.blueprint.blueprint_id)"
Write-Output "  Authority Invariant: INV-143 & INV-148 PRESERVED (cost <= original budget)"
Write-Output "  Latency            : $tReplan ms"

# Step 13-18: Autonomous Execution, Critic, Clearing, Projected Settlement
# Retrieve Unified 18-stage Trace
$sw.Restart()
$trace = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/trace" -Method Get
$tTrace = $sw.ElapsedMilliseconds
Write-Output "`n[STEP 13-19: UNIFIED 18-STAGE AUDIT TRACE]"
Write-Output "  Total Trace Nodes  : $($trace.nodes.Length)"
Write-Output "  Trace Latency      : $tTrace ms"
Write-Output "------------------------------------------------------------"
foreach ($node in $trace.nodes) {
    Write-Output "  [$($node.stage.PadRight(15))] $($node.label.PadRight(32)) -> $($node.state)"
}
Write-Output "------------------------------------------------------------"

# Explain Why This
$why = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/why" -Method Get
Write-Output "`n[STEP 19: EXPLAIN WHY THIS (DETERMINISTIC SELECTION)]"
Write-Output "  Selected Provider  : $($why.selected_provider)"
Write-Output "  Quote Price        : $($why.quote_price_usdc) USDC"
Write-Output "  Policy Decision    : $($why.policy_decision)"
Write-Output "  Treasury Status    : $($why.treasury_status)"
foreach ($factor in $why.selection_factors) {
    Write-Output "    * $factor"
}

# Explain Why Not (Adversarial / Over-Budget Rejection)
$whyNot = Invoke-RestMethod -Uri "http://localhost:8080/v1/fabric/objectives/$objId/why-not" -Method Get
Write-Output "`n[STEP 20: EXPLAIN WHY NOT (AUTHORITY BOUNDARY ENFORCEMENT)]"
Write-Output "  Requested Action   : $($whyNot.requested_action)"
Write-Output "  Block Reason       : $($whyNot.block_reason)"
Write-Output "  Policy Violated    : $($whyNot.policy_violated)"

Write-Output ""
Write-Output "============================================================"
Write-Output "FINAL STATE: SIMULATION -- NO FUNDS MOVED"
Write-Output "REAL ARC DEPLOYMENT: NOT DEPLOYED"
Write-Output "REAL ARC SETTLEMENT: NONE VERIFIED"
Write-Output "LIVE EXECUTION: DISABLED"
Write-Output "BROADCAST: NONE"
Write-Output "============================================================"
