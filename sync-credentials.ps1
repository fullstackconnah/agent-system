# sync-credentials.ps1
# Run this ONCE on your Windows desktop to push Claude + Gemini credentials to your server
# Prerequisites: OpenSSH installed (comes with Windows 10+)

$SERVER_IP   = "192.168.4.100"
$SERVER_USER = "connah"
$SERVER      = "$SERVER_USER@$SERVER_IP"

Write-Host ""
Write-Host "=== Agent System Credential Sync ===" -ForegroundColor Cyan
Write-Host "Target: $SERVER" -ForegroundColor Cyan
Write-Host ""

# --- Claude ---
Write-Host "[ 1/2 ] Syncing Claude credentials..." -ForegroundColor Yellow

$claudePaths = @(
    "$env:APPDATA\Claude",
    "$env:USERPROFILE\.claude"
)

$claudeFound = $false
foreach ($path in $claudePaths) {
    if (Test-Path $path) {
        Write-Host "        Found at: $path" -ForegroundColor Green
        ssh $SERVER "mkdir -p ~/.claude"
        scp -r "$path\*" "${SERVER}:~/.claude/"
        $claudeFound = $true
        break
    }
}

if (-not $claudeFound) {
    Write-Host "        ERROR: Claude credentials not found." -ForegroundColor Red
    Write-Host "        Make sure you've run 'claude login' on this machine." -ForegroundColor Red
}

# --- Gemini ---
Write-Host ""
Write-Host "[ 2/2 ] Syncing Gemini credentials..." -ForegroundColor Yellow

$geminiPaths = @(
    "$env:USERPROFILE\.gemini",
    "$env:APPDATA\gemini",
    "$env:LOCALAPPDATA\gemini",
    "$env:USERPROFILE\.config\gemini"
)

$geminiFound = $false
foreach ($path in $geminiPaths) {
    if (Test-Path $path) {
        Write-Host "        Found at: $path" -ForegroundColor Green
        ssh $SERVER "mkdir -p ~/.gemini"
        scp -r "$path\*" "${SERVER}:~/.gemini/"
        $geminiFound = $true
        break
    }
}

if (-not $geminiFound) {
    Write-Host "        ERROR: Gemini credentials not found." -ForegroundColor Red
    Write-Host "        Make sure you've run 'gemini auth login' on this machine." -ForegroundColor Red
}

# --- Verify ---
Write-Host ""
Write-Host "=== Verifying on server ===" -ForegroundColor Cyan
ssh $SERVER "echo '--- Claude ---' && ls ~/.claude 2>/dev/null && echo OK || echo MISSING && echo '--- Gemini ---' && ls ~/.gemini 2>/dev/null && echo OK || echo MISSING"

Write-Host ""
Write-Host "Done. You can now start the stack on the server." -ForegroundColor Green
