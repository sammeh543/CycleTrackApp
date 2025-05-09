@echo off
cd /d "%~dp0"
REM Kill any processes using port 5000
echo Killing any lingering process using port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTEN"') do taskkill /PID %%a /F

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

REM Only install electronmon if not present
if not exist node_modules\electronmon (
    echo Installing electronmon...
    npm install --no-save electronmon
    if %ERRORLEVEL% neq 0 (
        echo Error installing electronmon.
        pause
        exit /b 1
    )
)

REM Launch Electron in dev mode with hot reload
call npx electronmon main.cjs
if %ERRORLEVEL% neq 0 (
    echo.
    echo There was an error running 'npx electronmon main.cjs'.
    pause
    exit /b 1
)

echo.
echo Electron dev session ended. Press any key to close this window...
pause
