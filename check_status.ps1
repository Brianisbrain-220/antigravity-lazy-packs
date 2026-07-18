# check_status.ps1 - Diagnostic tool for Anti-Gravity service credentials and status

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "     Anti-Gravity Services Auth Diagnostic Tool" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Git / GitHub status
Write-Host "[1/4] Checking Git & GitHub..." -ForegroundColor Cyan
$GitUser = & "git.exe" config user.name 2>$null
$GitEmail = & "git.exe" config user.email 2>$null
if ($GitUser) {
    Write-Host "  -> Git Config: User '$GitUser' ($GitEmail)" -ForegroundColor Green
} else {
    Write-Host "  -> [⚠️] Git user name not set. Set it using: git config --global user.name 'Your Name'" -ForegroundColor Yellow
}

$GhStatus = & "gh.exe" auth status 2>&1
if ($GhStatus -match "Logged in to github.com as ([^\s]+)") {
    Write-Host "  -> GitHub CLI: Logged in as $($Matches[1])" -ForegroundColor Green
} else {
    Write-Host "  -> [❌] GitHub CLI not logged in. Fix: Run 'gh auth login'" -ForegroundColor Red
}
Write-Host ""

# 2. NotebookLM status
Write-Host "[2/4] Checking NotebookLM CLI..." -ForegroundColor Cyan
$NlmStatus = & "nlm.exe" doctor 2>&1
if ($NlmStatus -match "Authenticated" -or $NlmStatus -match "Success") {
    Write-Host "  -> NotebookLM: Authenticated!" -ForegroundColor Green
} elseif ($NlmStatus -match "not authenticated" -or $NlmStatus -match "expired" -or $error) {
    Write-Host "  -> [❌] NotebookLM credentials expired or not logged in." -ForegroundColor Red
    Write-Host "  -> [Fix]: Please run 'nlm login' in your host terminal." -ForegroundColor Yellow
} else {
    $NlmList = & "nlm.exe" list 2>$null
    if ($NlmList) {
        Write-Host "  -> NotebookLM: Authenticated (list succeeded)" -ForegroundColor Green
    } else {
        Write-Host "  -> [❌] NotebookLM authentication failed. Please run 'nlm login'." -ForegroundColor Red
    }
}
Write-Host ""

# 3. Firebase status
Write-Host "[3/4] Checking Firebase CLI..." -ForegroundColor Cyan
$WrapperPath = "$env:USERPROFILE\.gemini\antigravity\scratch\firebase-wrapper.js"
if (Test-Path $WrapperPath) {
    $FbStatus = node $WrapperPath projects:list 2>&1
    if ($FbStatus -match "Failed to authenticate" -or $FbStatus -match "Authentication Error") {
        Write-Host "  -> [❌] Firebase credentials expired or not logged in." -ForegroundColor Red
        Write-Host "  -> [Fix]: Please run the following command in PowerShell to log in:" -ForegroundColor Yellow
        Write-Host "     node `"$WrapperPath`" login --no-localhost" -ForegroundColor Yellow
    } else {
        Write-Host "  -> Firebase: Authenticated!" -ForegroundColor Green
    }
} else {
    Write-Host "  -> [⚠️] firebase-wrapper.js not found at $WrapperPath" -ForegroundColor Yellow
    Write-Host "  -> Running standard firebase projects:list..." -ForegroundColor Gray
    $FbStatus = & "firebase.cmd" projects:list 2>&1
    if ($FbStatus -match "Failed to authenticate") {
        Write-Host "  -> [❌] Firebase not logged in. Please run 'firebase login'." -ForegroundColor Red
    } else {
        Write-Host "  -> Firebase: Authenticated!" -ForegroundColor Green
    }
}
Write-Host ""

# 4. Obsidian Vault status
Write-Host "[4/4] Checking Obsidian Vault..." -ForegroundColor Cyan
$ConfigPath = "$env:USERPROFILE\.gemini\config\mcp_config.json"
if (Test-Path $ConfigPath) {
    $Config = Get-Content $ConfigPath | ConvertFrom-Json
    $ObsidianPath = $Config.mcpServers.obsidian.args[0]
    if ($ObsidianPath) {
        if (Test-Path $ObsidianPath) {
            Write-Host "  -> Obsidian: Connected and path exists!" -ForegroundColor Green
            Write-Host "     Path: $ObsidianPath" -ForegroundColor Gray
        } else {
            Write-Host "  -> [❌] Cannot find Obsidian vault directory." -ForegroundColor Red
            Write-Host "     Configured Path: $ObsidianPath" -ForegroundColor Red
        }
    } else {
        Write-Host "  -> [⚠️] obsidian args not found in mcp_config.json." -ForegroundColor Yellow
    }
} else {
    Write-Host "  -> [⚠️] mcp_config.json not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
