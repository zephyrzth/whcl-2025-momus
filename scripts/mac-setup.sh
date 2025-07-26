#!/bin/bash
set -e

echo "🚀 Setting up ICP Vibe Coding development environment..."

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Set up dfx identity for codespace
echo "🔑 Setting up dfx identity..."
dfxvm install 0.25.0

# Create dfx config directory with proper permissions if it doesn't exist
# echo "📁 Ensuring dfx config directory exists..."
# mkdir -p ~/.config/dfx/identity
# chmod 755 ~/.config/dfx/identity

# Remove existing identity if it exists and create new one
echo "🗑️  Cleaning up existing identity..."
dfx identity use default
dfx identity remove codespace_dev 2>/dev/null || echo "No existing identity to remove"

echo "🆕 Creating new identity..."
dfx identity new codespace_dev --storage-mode=plaintext

dfx identity use codespace_dev      
dfx start --background             
dfx stop

# Install mops dependencies
echo "📦 Installing mops dependencies..."
npm install -g ic-mops
mops install