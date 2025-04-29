@echo off
cd /d "%~dp0"
setlocal EnableDelayedExpansion

REM CycleTrackApp - Server/Browser Production Mode (NO BUILD)
REM This script starts the server in production mode WITHOUT building.

REM Kill any process using port 5000 only (to avoid killing unrelated Node.js apps)
echo Killing any lingering process using port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTEN"') do taskkill /PID %%a /F

REM Check Node.js
where node >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo Error: Node.js is not installed or not in your PATH.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo Error: npm is not installed or not in your PATH.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    npm install
    if !ERRORLEVEL! neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

REM Start the production server with production environment (NO BUILD)
echo Starting production server (NO BUILD)...
set NODE_ENV=production

REM Run the server and capture its output
echo Server output will appear below:
echo ------------------------
call npm start 2>&1
set EXIT_CODE=!ERRORLEVEL!

if !EXIT_CODE! neq 0 (
    echo ------------------------
    echo Server crashed with error code !EXIT_CODE!
) else (
    echo ------------------------
    echo Server stopped normally
)

echo.
echo Press any key to close this window...
pause >nul
exit /b !EXIT_CODE!
