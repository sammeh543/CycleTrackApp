@echo off
REM CycleTrackApp - Server/Browser Dev Mode
REM This script starts the server (network/browser version) with hot reload for development.
echo Starting CycleTrackApp server (network/browser version, Dev Mode, Hot Reload)...

REM Kill any process using port 5000 only (to avoid killing unrelated Node.js apps)
echo Killing any lingering process using port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTEN"') do taskkill /PID %%a /F

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in your PATH.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm is not installed or not in your PATH.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo Error installing dependencies.
        pause
        exit /b 1
    )
)

REM Open the local dev server in the default web browser
REM Change the port below if your app uses a different one
start http://localhost:5000

REM Start the dev server with hot reload
call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo There was an error running 'npm run dev'.
    pause
    exit /b 1
)

echo.
echo Dev server stopped. Press any key to close this window...
pause
