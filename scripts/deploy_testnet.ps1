# ==============================================================================
# AgentPay: Secure Arc Testnet Deployment Script (PowerShell)
# ==============================================================================
# Target Network: Arc Testnet (Chain ID 5042002 / 0x4cef52)
# Explorer: https://testnet.arcscan.app/
# ==============================================================================
param(
    [switch]$Confirm,
    [switch]$Browser,
    [string]$Account,
    [switch]$VerifySigner
)

$ErrorActionPreference = "Stop"

# Initialize directory paths first
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$contractsDir = Join-Path $rootDir "contracts"

# Initialize target configuration parameters
$ARC_RPC_URL = if ($env:ARC_RPC_URL) { $env:ARC_RPC_URL } else { "https://rpc.testnet.arc.network" }
$ARC_CHAIN_ID = 5042002
$ARC_USDC_ADDRESS = "0x3600000000000000000000000000000000000000"
$AGENT_ID = "research-agent"
$INITIAL_OWNER = if ($env:COLD_MULTISIG_OWNER) { $env:COLD_MULTISIG_OWNER } elseif ($env:INITIAL_OWNER) { $env:INITIAL_OWNER } else { "0x2a3613d44799ce28385058358586e8d311ee6c57" }

# Resolve Foundry binary paths
$foundryBin = Join-Path $env:USERPROFILE ".foundry\bin"
$forgeExe = if (Test-Path (Join-Path $foundryBin "forge.exe")) { Join-Path $foundryBin "forge.exe" } else { "forge" }
$castExe = if (Test-Path (Join-Path $foundryBin "cast.exe")) { Join-Path $foundryBin "cast.exe" } else { "cast" }

# Configure Foundry Environment for child processes
$env:ARC_REQUIRE_MAINNET = "false"
$env:ARC_CHAIN_ID = "$ARC_CHAIN_ID"
$env:ARC_USDC_ADDRESS = "$ARC_USDC_ADDRESS"
$env:AGENT_ID = "$AGENT_ID"
$env:COLD_MULTISIG_OWNER = "$INITIAL_OWNER"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "          AgentPay: Secure Arc Testnet Deployment                 " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Destination Network: Arc Testnet"
Write-Host "Target Chain ID:     $ARC_CHAIN_ID"
Write-Host "Target RPC URL:      $ARC_RPC_URL"
Write-Host "USDC Contract:       $ARC_USDC_ADDRESS"
Write-Host "Agent ID:            $AGENT_ID"
Write-Host "Initial Vault Owner: $INITIAL_OWNER"
if ($Browser) {
    Write-Host "Signing Method:      Browser Wallet (MetaMask via localhost:9545)" -ForegroundColor Yellow
} elseif ($Account) {
    Write-Host "Signing Method:      Foundry Keystore Account ($Account)" -ForegroundColor Yellow
} else {
    Write-Host "Signing Method:      Interactive Hidden Console Prompt" -ForegroundColor Yellow
}
Write-Host "==================================================================" -ForegroundColor Cyan

if (-not $Confirm) {
    Write-Host "WARNING: You are about to broadcast to Arc Testnet (Chain ID $ARC_CHAIN_ID)." -ForegroundColor Yellow
    $userInput = Read-Host "To proceed, type 'DEPLOY-ARC-TESTNET' and press Enter"
    if ($userInput -ne "DEPLOY-ARC-TESTNET") {
        Write-Error "Confirmation mismatch. Deployment aborted."
        exit 1
    }
}

# Pre-flight chain ID verification via live RPC
Write-Host "Querying live RPC at $ARC_RPC_URL for chain ID..."
$body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
$response = Invoke-RestMethod -Uri $ARC_RPC_URL -Method Post -Body $body -ContentType "application/json"
$detectedHex = $response.result
$expectedHex = "0x" + [Convert]::ToString($ARC_CHAIN_ID, 16)

if ($detectedHex.ToLower() -ne $expectedHex.ToLower()) {
    Write-Error "Chain ID mismatch! RPC reported $detectedHex, expected $expectedHex ($ARC_CHAIN_ID)"
    exit 1
}

Write-Host "Verified live RPC Chain ID matches expected Arc Testnet: $ARC_CHAIN_ID ($detectedHex)" -ForegroundColor Green

# Optional local signer pre-verification
if ($VerifySigner) {
    Write-Host "Verifying signer identity locally before broadcasting..." -ForegroundColor Yellow
    if ($Browser) {
        Write-Host "Browser wallet signing selected; signer verified via MetaMask connection." -ForegroundColor Green
    } elseif ($Account) {
        $derivedAddress = (& $castExe wallet address --account "$Account").Trim()
        $castExit = $LASTEXITCODE
        if ($castExit -ne 0 -or [string]::IsNullOrWhiteSpace($derivedAddress)) {
            Write-Error "Signer verification failed or was cancelled (exit code: $castExit)."
            exit 1
        }
        if ($derivedAddress.ToLower() -ne $INITIAL_OWNER.ToLower()) {
            Write-Error "CRITICAL MISMATCH: Derived address ($derivedAddress) does NOT match expected initial owner ($INITIAL_OWNER)!"
            exit 1
        }
        Write-Host "Signer identity verified: $derivedAddress matches intended initial owner!" -ForegroundColor Green
    } else {
        Write-Host "Enter Account 1 private key into cast prompt to verify public address:" -ForegroundColor Cyan
        $derivedAddress = (& $castExe wallet address --interactive).Trim()
        $castExit = $LASTEXITCODE
        if ($castExit -ne 0 -or [string]::IsNullOrWhiteSpace($derivedAddress)) {
            Write-Error "Signer verification failed or was cancelled (exit code: $castExit)."
            exit 1
        }
        if ($derivedAddress.ToLower() -ne $INITIAL_OWNER.ToLower()) {
            Write-Error "CRITICAL MISMATCH: Derived address ($derivedAddress) does NOT match expected initial owner ($INITIAL_OWNER)!"
            exit 1
        }
        Write-Host "Signer identity verified: $derivedAddress matches intended initial owner!" -ForegroundColor Green
    }
}

# Flush any stray buffered input in the console window
try {
    if (-not [Console]::IsInputRedirected) {
        while ([Console]::KeyAvailable) {
            [void][Console]::ReadKey($true)
        }
    }
} catch {
    # Ignore if non-interactive host
}

# Build Forge Script arguments
$forgeArgs = @(
    "script", "script/DeployAgentVault.s.sol:DeployAgentVault",
    "--rpc-url", "$ARC_RPC_URL",
    "--sender", "$INITIAL_OWNER",
    "--broadcast",
    "--slow"
)

if ($Browser) {
    $forgeArgs += @("--browser")
    Write-Host "Launching Foundry with browser wallet connector..." -ForegroundColor Yellow
    Write-Host "Target Sender Address: $INITIAL_OWNER" -ForegroundColor Cyan
    Write-Host "A browser window will open at http://localhost:9545 to connect MetaMask Account 1." -ForegroundColor Green
} elseif ($Account) {
    $forgeArgs += @("--account", "$Account")
    Write-Host "Launching Foundry with keystore account: $Account..." -ForegroundColor Yellow
    Write-Host "Target Sender Address: $INITIAL_OWNER" -ForegroundColor Cyan
} else {
    $forgeArgs += @("--interactive")
    Write-Host "Launching Foundry with interactive secure signer prompt..." -ForegroundColor Yellow
    Write-Host "Target Sender Address: $INITIAL_OWNER" -ForegroundColor Cyan
    Write-Host "IMPORTANT: Forge will first compile and simulate the script." -ForegroundColor Magenta
    Write-Host "WAIT until simulation finishes and you see the prompt:" -ForegroundColor Magenta
    Write-Host "    Enter private key:" -ForegroundColor Green
    Write-Host "Do NOT paste or press Enter before that prompt appears." -ForegroundColor Magenta
}

Push-Location $contractsDir
try {
    & $forgeExe @forgeArgs

    $forgeExit = $LASTEXITCODE
    if ($forgeExit -ne 0) {
        Write-Error "Foundry deployment script failed with exit code $forgeExit. Deployment was aborted or failed on-chain."
        exit $forgeExit
    }
}
finally {
    Pop-Location
}

Write-Host "=== Testnet Deployment Completed Successfully ===" -ForegroundColor Green
Write-Host "Explorer: https://testnet.arcscan.app/"
Write-Host "NOTE: Gateway live execution remains disabled by default (ENABLE_LIVE_EXECUTION=false)."
