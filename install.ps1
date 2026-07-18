# install.ps1 - Install all skills safely to Anti-Gravity global directory

$ErrorActionPreference = "Stop"

$HomeDir = [System.Environment]::GetFolderPath("UserProfile")
$GlobalSkillsDir = Join-Path $HomeDir ".gemini\config\skills"
$LocalSkillsDir = Join-Path $PSScriptRoot "skills"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Anti-Gravity Skills Installer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Source: $LocalSkillsDir" -ForegroundColor Gray
Write-Host "Destination: $GlobalSkillsDir" -ForegroundColor Gray
Write-Host ""

if (!(Test-Path $GlobalSkillsDir)) {
    New-Item -ItemType Directory -Path $GlobalSkillsDir | Out-Null
    Write-Host "Created global skills folder: $GlobalSkillsDir" -ForegroundColor Green
}

if (!(Test-Path $LocalSkillsDir)) {
    Write-Error "Cannot find local skills/ folder. Run this script in project root."
    exit 1
}

$Skills = Get-ChildItem -Path $LocalSkillsDir -Directory

foreach ($Skill in $Skills) {
    $SkillName = $Skill.Name
    if (!(Test-Path (Join-Path $Skill.FullName "SKILL.md"))) {
        Write-Host "Skip invalid skill: $SkillName" -ForegroundColor Yellow
        continue
    }

    $TargetDir = Join-Path $GlobalSkillsDir $SkillName
    
    if (Test-Path $TargetDir) {
        Remove-Item -Path $TargetDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TargetDir | Out-Null

    Copy-Item -Path "$($Skill.FullName)\*" -Destination $TargetDir -Recurse -Force
    Write-Host "Installed skill: $SkillName" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Installation completed successfully! Please restart or refresh Anti-Gravity / Codex." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
