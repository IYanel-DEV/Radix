@echo off
chcp 65001 >nul
echo ===================================================
echo     LAUNCHING SERVER PANEL EXTRACTION DEBUGGER     
echo ===================================================
cd /d "%~dp0"
if not exist "test-server.zip" (
    echo [ERROR] test-server.zip not found in this folder!
    echo Please drop a sample game server zip named 'test-server.zip' here first.
    pause
    exit /b
)
echo Found test-server.zip. Running isolated pipeline...
echo.
node debug-extractor.js %*
echo.
echo ===================================================
echo     DEBUG EXECUTION COMPLETE
echo ===================================================
echo.
echo You can pass an engine type as argument, e.g.:
echo   debug.bat unreal
echo   debug.bat unity
echo.
pause
