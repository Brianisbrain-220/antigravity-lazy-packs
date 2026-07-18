# setup_env.ps1 - Automatically add tool paths to User PATH to fix CLI execution issues

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Anti-Gravity PATH Environment variable Repair Tool" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$Tools = @(
    @{
        Name = "Git"
        ExeName = "git.exe"
        SearchPaths = @(
            "C:\Program Files\Git\cmd",
            "C:\Program Files (x86)\Git\cmd"
        )
    },
    @{
        Name = "GitHub CLI"
        ExeName = "gh.exe"
        SearchPaths = @(
            "C:\Program Files\GitHub CLI",
            "C:\Users\$env:USERNAME\AppData\Local\Programs\gh"
        )
    },
    @{
        Name = "NotebookLM CLI"
        ExeName = "nlm.exe"
        SearchPaths = @(
            "C:\Users\$env:USERNAME\AppData\Roaming\Python\Python314\Scripts",
            "C:\Users\$env:USERNAME\AppData\Roaming\Python\Python313\Scripts",
            "C:\Users\$env:USERNAME\AppData\Roaming\Python\Python312\Scripts",
            "C:\Users\$env:USERNAME\.local\bin"
        )
    },
    @{
        Name = "Firebase CLI"
        ExeName = "firebase.cmd"
        SearchPaths = @(
            "C:\Users\$env:USERNAME\AppData\Roaming\npm"
        )
    }
)

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathsToAdd = @()
$AlreadyOK = @()

foreach ($Tool in $Tools) {
    Write-Host "Checking $($Tool.Name)..." -ForegroundColor Gray
    
    $Found = Get-Command -Name $Tool.ExeName -ErrorAction SilentlyContinue
    if ($Found) {
        Write-Host "  -> [OK] Already in PATH: $($Found.Source)" -ForegroundColor Green
        $AlreadyOK += $Tool.Name
        continue
    }
    
    $PathFound = $null
    foreach ($SearchPath in $Tool.SearchPaths) {
        $SearchPathResolved = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($SearchPath)
        if (Test-Path (Join-Path $SearchPathResolved $Tool.ExeName)) {
            $PathFound = $SearchPathResolved
            break
        }
    }
    
    if ($PathFound) {
        Write-Host "  -> [Found] Found at: $PathFound" -ForegroundColor Yellow
        if ($UserPath -notlike "*$PathFound*") {
            $PathsToAdd += $PathFound
        } else {
            Write-Host "  -> [Notice] Path already in User PATH registry, but terminal session not refreshed." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  -> [Missing] Cannot find $($Tool.ExeName) in default paths. Please install the tool." -ForegroundColor Red
    }
}

if ($PathsToAdd.Count -gt 0) {
    Write-Host ""
    Write-Host "Appending the following paths to User PATH..." -ForegroundColor Cyan
    foreach ($Path in $PathsToAdd) {
        $UserPath += ";$Path"
        Write-Host "  + $Path" -ForegroundColor DarkCyan
    }
    
    [Environment]::SetEnvironmentVariable("Path", $UserPath, "User")
    Write-Host ""
    Write-Host "✅ User PATH updated successfully!" -ForegroundColor Green
    Write-Host "💡 IMPORTANT: Please restart VSCode, Codex, or your terminal for the changes to take effect." -ForegroundColor Yellow
} else {
    Write-Host ""
    if ($AlreadyOK.Count -eq $Tools.Count) {
        Write-Host "🎉 Perfect! All tools are already configured in PATH." -ForegroundColor Green
    } else {
        Write-Host "No paths added. Please install the missing tools." -ForegroundColor Yellow
    }
}
Write-Host "==================================================" -ForegroundColor Cyan
