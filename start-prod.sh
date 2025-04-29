#!/bin/bash
cd "$(dirname "$0")"
# CycleTrackApp - Production Mode Launcher (Linux/Mac/Pi)

if ! command -v node &> /dev/null; then
    echo "Node.js is not installed or not in your PATH!"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo "npm is not installed or not in your PATH!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error installing dependencies."
        exit 1
    fi
fi

echo "Building for production..."
npm run build

echo "Launching CycleTrackApp server (Production Mode)..."
npm start &

# Give the server a few seconds to start
sleep 3

echo "Opening http://localhost:5000 in your browser..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5000
elif command -v open &> /dev/null; then
    open http://localhost:5000
else
    echo "Please open http://localhost:5000 in your browser."
fi

echo "The server is running in the background. To stop it, use 'pkill -f dist-web/index.js' or close the terminal running the server."
