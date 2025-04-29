@echo off
REM Cleanup utility for CycleSense/Electron/Node processes and dev ports

REM Kill any processes using port 5000
echo Killing any lingering process using port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTEN"') do taskkill /PID %%a /F

echo.
echo All relevant ports and processes have been cleaned up.
pause
