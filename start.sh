#!/bin/bash
# CycleSense Desktop Launcher

if ! command -v node &> /dev/null; then
    echo "Node.js is not installed or not in your PATH!"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo "npm is not installed or not in your PATH!"
    exit 1
fi

echo "Launching CycleSense desktop..."
npm run electron