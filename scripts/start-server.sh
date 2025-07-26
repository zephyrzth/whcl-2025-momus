#!/bin/bash

# 🎯 Simple Deploy and Register Script
# ====================================

echo "🎯 Start DFX Server"
echo "===================================="

# Install npm dependencies
echo "1️⃣  Installing npm dependencies..."
npm install

# Pull and deploy dependencies
echo "2️⃣ Pulling dependencies..."
mops install

# Stop any existing dfx processes and start clean
echo "3️⃣ Stopping existing dfx processes..."
dfx stop
pkill -f dfx 2>/dev/null || true
sleep 2

echo "4️⃣ Starting clean dfx environment..."
dfx start --clean
