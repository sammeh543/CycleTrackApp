@echo off
REM CycleTrack2Surf - Development Mode
REM This script starts the server with hot reload for development.
echo Development server starting with hot reload...

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
