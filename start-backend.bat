@echo off
title Server Manager - Backend
echo ========================================
echo   Game Server Manager - Backend
echo ========================================
echo.
echo Starting backend on http://localhost:3001
echo API docs at http://localhost:3001/api/docs
echo.
cd /d "%~dp0backend"
if not exist "data" mkdir data
npm run start:dev
pause
