@echo off
title Game Server Manager
echo ========================================
echo   Game Server Manager - Quick Start
echo ========================================
echo.
echo Starting Backend (port 3001)...
cd /d "%~dp0backend"
if not exist "data" mkdir data
start "Backend" cmd /c "title Backend & node dist/main.js"
echo Backend started!

echo Starting Frontend (port 3000)...
cd /d "%~dp0frontend"
start "Frontend" cmd /c "title Frontend & node node_modules\next\dist\bin\next dev -p 3000"
echo Frontend started!
echo.
echo ========================================
echo   URLs:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:3001
echo   API Docs:  http://localhost:3001/api/docs
echo   Metrics:   http://localhost:3001/metrics
echo ========================================
echo.
echo Close this window or press any key to exit.
pause >nul
