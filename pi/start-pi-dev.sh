#!/bin/bash
# CycleTrackApp - Raspberry Pi Dev Mode Launcher

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

echo "Launching CycleTrackApp server on Raspberry Pi (Dev Mode)..."
npm run dev
