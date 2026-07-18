# guard.ps1 - Anti-Gravity Secret Shield Tool

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("Check", "SetKey", "InitIgnore")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Key,

    [Parameter(Mandatory=$false)]
    [string]$Value,

    [Parameter(Mandatory=$false)]
    [string]$TargetProjectDir = "."
)

$ErrorActionPreference = "Stop"

# Helper function to check/update .gitignore for a pattern
function Add-ToGitIgnore {
    param([string]$Pattern, [string]$IgnorePath)
    if (!(Test-Path $IgnorePath)) {
        New-Item -ItemType File -Path $IgnorePath -Force | Out-Null
    }
    $Content = Get-Content $IgnorePath -ErrorAction SilentlyContinue
    $Exists = $false
    foreach ($Line in $Content) {
        if ($Line.Trim() -eq $Pattern) {
            $Exists = $true
            break
        }
    }
    if (!$Exists) {
        Add-Content -Path $IgnorePath -Value $Pattern
        Write-Host "Added '$Pattern' to $IgnorePath" -ForegroundColor Green
    }
}

if ($Action -eq "Check") {
    Write-Host "Scanning workspace for potential hardcoded credentials..." -ForegroundColor Cyan
    $Excludes = @("node_modules", ".git", "dist", "temp", "tmp", "guard.ps1")
    $Patterns = @(
        @{ Name = "Google/Gemini API Key"; Reg = "AIzaSy[A-Za-z0-9_\-]{35}" },
        @{ Name = "GitHub PAT"; Reg = "ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}" }
    )

    $Files = Get-ChildItem -Path $TargetProjectDir -Recurse -File -ErrorAction SilentlyContinue
    $LeakedCount = 0

    foreach ($File in $Files) {
        $Skip = $false
        foreach ($Ex in $Excludes) {
            if ($File.FullName -like "*$Ex*") {
                $Skip = $true
                break
            }
        }
        if ($Skip) { continue }

        $Content = Get-Content $File.FullName -ErrorAction SilentlyContinue
        if ($null -eq $Content) { continue }

        $LineNum = 1
        foreach ($Line in $Content) {
            # Skip matches that are comments or explainers (containing "dummy" or "YOUR_DUMMY_")
            if ($Line -match "dummy" -or $Line -match "YOUR_DUMMY_") {
                $LineNum++
                continue
            }
            foreach ($P in $Patterns) {
                if ($Line -match $P.Reg) {
                    Write-Host "[❌ LEAK DETECTED] File: $($File.FullName) (Line: $LineNum) - Found $($P.Name)" -ForegroundColor Red
                    Write-Host "   Line content: $($Line.Trim())" -ForegroundColor DarkRed
                    $LeakedCount++
                }
            }
            $LineNum++
        }
    }

    if ($LeakedCount -gt 0) {
        Write-Error "Secret Scan Failed: $LeakedCount potential credentials found! Please remove them before committing."
        exit 1
    } else {
        Write-Host "🎉 Scan completed: No active secrets found!" -ForegroundColor Green
    }
}
elseif ($Action -eq "SetKey") {
    if ([string]::IsNullOrEmpty($Key) -or [string]::IsNullOrEmpty($Value)) {
        Write-Error "SetKey requires both -Key and -Value parameters."
        exit 1
    }

    $EnvFile = Join-Path $TargetProjectDir ".env.local"
    $IgnoreFile = Join-Path $TargetProjectDir ".gitignore"

    # Make sure .env.local exists
    if (!(Test-Path $EnvFile)) {
        New-Item -ItemType File -Path $EnvFile -Force | Out-Null
        Write-Host "Created new env file: $EnvFile" -ForegroundColor Green
    }

    # Read and parse existing keys
    $Lines = Get-Content $EnvFile -ErrorAction SilentlyContinue
    $Updated = $false
    $NewLines = @()

    foreach ($Line in $Lines) {
        if ($Line.Trim().StartsWith("$Key=")) {
            $NewLines += "$Key=$Value"
            $Updated = $true
            Write-Host "Updated key: $Key in $EnvFile" -ForegroundColor Green
        } else {
            $NewLines += $Line
        }
    }

    if (!$Updated) {
        $NewLines += "$Key=$Value"
        Write-Host "Added key: $Key to $EnvFile" -ForegroundColor Green
    }

    $NewLines | Set-Content $EnvFile -Encoding utf8

    # Ensure .env.local is ignored in git
    Add-ToGitIgnore -Pattern ".env.local" -IgnorePath $IgnoreFile
    Add-ToGitIgnore -Pattern ".env" -IgnorePath $IgnoreFile
}
elseif ($Action -eq "InitIgnore") {
    $IgnoreFile = Join-Path $TargetProjectDir ".gitignore"
    Write-Host "Initializing standard .gitignore templates..." -ForegroundColor Cyan

    $Defaults = @(
        "node_modules/",
        "dist/",
        "temp/",
        "tmp/",
        "*.bak",
        ".env",
        ".env.local",
        ".env.development.local",
        ".env.test.local",
        ".env.production.local",
        ".tmp.driveupload/"
    )

    foreach ($Pattern in $Defaults) {
        Add-ToGitIgnore -Pattern $Pattern -IgnorePath $IgnoreFile
    }

    Write-Host "✅ .gitignore configured successfully!" -ForegroundColor Green
}
