@echo off
title Server Manager - Frontend
echo ========================================
echo   Game Server Manager - Frontend
echo ========================================
echo.
echo Starting frontend on http://localhost:3000
echo.
cd /d "%~dp0frontend"
npm run dev
pause
