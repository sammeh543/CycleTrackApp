@echo off
cd /d "%~dp0"
REM Kill any processes using port 5000
echo Killing any lingering process using port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTEN"') do taskkill /PID %%a /F
REM Kill any lingering electron or node processes (optional, more aggressive)
taskkill /IM electron.exe /F >nul 2>nul
taskkill /IM node.exe /F >nul 2>nul

REM Modern CycleSense Dev: Separate Frontend/Electron

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

npm run dev:full
