@echo off
REM CycleSense Desktop Launcher

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in your PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm is not installed or not in your PATH.
    pause
    exit /b 1
)

echo Launching CycleSense desktop...
npm run electron