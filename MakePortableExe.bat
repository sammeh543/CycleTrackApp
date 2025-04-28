@echo off
REM CycleSense Desktop Builder & Packager

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

echo Building application source...
npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Build step failed.
    pause
    exit /b 1
)

echo Packaging CycleSense desktop...
npm run dist
if %ERRORLEVEL% neq 0 (
    echo Error: Packaging step failed.
    pause
    exit /b 1
)

echo Done. Packaged application should be in the 'dist' folder.
pause