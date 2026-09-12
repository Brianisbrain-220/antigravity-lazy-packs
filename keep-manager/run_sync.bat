@echo off
cd /d "%~dp0"
set PYTHONUTF8=1
"%~dp0.venv\Scripts\python.exe" main.py --mode=incremental --execute >> "%~dp0logs\launcher.log" 2>&1
