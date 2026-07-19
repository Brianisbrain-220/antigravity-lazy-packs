# migrate_paths.ps1 - Automatically repair absolute paths in mcp_config.json after migrating to a new machine

$ErrorActionPreference = "Stop"

$NewHome = [System.Environment]::GetFolderPath("UserProfile")
$ConfigPath = Join-Path $NewHome ".gemini\config\mcp_config.json"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Anti-Gravity MCP Configuration Path Repair Tool" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Config file target: $ConfigPath" -ForegroundColor Gray

if (!(Test-Path $ConfigPath)) {
    Write-Error "Cannot find mcp_config.json at $ConfigPath. Please make sure you have restored the config/ directory."
    exit 1
}

# Read content
$JsonContent = Get-Content $ConfigPath -Raw

# Check if old path pattern exists (e.g. C:\Users\hpand or C:/Users/hpand)
$OldUsername = $null
if ($JsonContent -match 'C:\\Users\\([^\\]+)\\') {
    $OldUsername = $Matches[1]
} elseif ($JsonContent -match 'C:/Users/([^/]+)/') {
    $OldUsername = $Matches[1]
}

$CurrentUsername = $env:USERNAME

if ($null -eq $OldUsername) {
    Write-Host "Cannot detect previous username pattern in configuration. Checking for direct replacement..." -ForegroundColor Yellow
    $OldUsername = "hpand"
}

Write-Host "Detected previous username: $OldUsername" -ForegroundColor Yellow
Write-Host "Current username: $CurrentUsername" -ForegroundColor Green

if ($OldUsername -eq $CurrentUsername) {
    Write-Host "🎉 Username is identical ($CurrentUsername). No path translation needed!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
    exit 0
}

Write-Host "Translating paths from '$OldUsername' to '$CurrentUsername'..." -ForegroundColor Cyan

# Replace both backslash and forward slash path formats
$OldPattern1 = "C:\\Users\\$OldUsername"
$NewPattern1 = "C:\\Users\\$CurrentUsername"
$OldPattern2 = "C:/Users/$OldUsername"
$NewPattern2 = "C:/Users/$CurrentUsername"

$UpdatedJson = $JsonContent.Replace($OldPattern1, $NewPattern1).Replace($OldPattern2, $NewPattern2)

# Write back
$UpdatedJson | Set-Content $ConfigPath -Encoding utf8

Write-Host "✅ Path translation completed successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
