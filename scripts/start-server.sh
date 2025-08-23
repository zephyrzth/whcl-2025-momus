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

# Set up Python environment (for Kybra canisters)
echo "3️⃣  Setting up Python environment (Kybra) ..."
if ! command -v python3 >/dev/null 2>&1; then
	echo "   📦 Installing python3..."
	apt-get update -y && apt-get install -y python3
fi

# Ensure venv package is available
if ! python3 -m venv --help >/dev/null 2>&1; then
	echo "   📦 Installing python3-venv..."
	apt-get update -y && apt-get install -y python3-venv
fi

# Create and/or activate virtual environment for kybra
if [ ! -d ".pyenv" ]; then
	echo "   🆕 Creating virtual environment .pyenv"
	python3 -m venv .pyenv;
    pip3 install kybra --break-system-packages;
fi
. ./.pyenv/bin/activate

# Stop any existing dfx processes and start clean
echo "4️⃣ Stopping existing dfx processes..."
dfx stop
pkill -f dfx 2>/dev/null || true
sleep 2

echo "5️⃣ Starting clean dfx environment..."
dfx start --clean
