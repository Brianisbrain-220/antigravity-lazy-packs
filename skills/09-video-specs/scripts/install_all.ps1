# Windows PowerShell 版本：一鍵安裝所有 optional 元件
# 用法：powershell -ExecutionPolicy Bypass -File install/install_all.ps1
$ErrorActionPreference = 'Stop'

Write-Host "1/3  安裝 Edge-TTS"
pip install --quiet edge-tts

Write-Host "2/3  下載源石黑體"
$FontsDir = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
New-Item -ItemType Directory -Force -Path $FontsDir | Out-Null
$Upstream = "https://github.com/ButTaiwan/genseki-font/raw/master/TW"
foreach ($f in @("GenSekiGothic2TW-H.otf","GenSekiGothic2TW-B.otf","GenSekiGothic2TW-M.otf")) {
  $dest = "$FontsDir\$f"
  if (Test-Path $dest) {
    Write-Host "  ✓ 已存在 $f"
  } else {
    Write-Host "  ↓ 下載 $f"
    Invoke-WebRequest -Uri "$Upstream/$f" -OutFile $dest
  }
}

# 同步 repo 副本
$RepoFonts = Join-Path (Split-Path (Split-Path $PSCommandPath -Parent) -Parent) "assets\fonts"
New-Item -ItemType Directory -Force -Path $RepoFonts | Out-Null
foreach ($f in @("GenSekiGothic2TW-H.otf","GenSekiGothic2TW-B.otf","GenSekiGothic2TW-M.otf")) {
  if (-not (Test-Path "$RepoFonts\$f")) {
    Copy-Item "$FontsDir\$f" "$RepoFonts\$f"
  }
}

Write-Host "3/3  安裝 Playwright（含 Chromium）"
$WorkDir = "$env:TEMP\cvs-render"
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
Push-Location $WorkDir
if (-not (Test-Path "package.json")) { npm init -y | Out-Null }
if (-not (Test-Path "node_modules\playwright")) { npm install playwright }
npx playwright install chromium
Pop-Location

Write-Host ""
Write-Host "✅ 全部就緒。可以進入階段 2（試做影片）了"
