#!/bin/bash

# Weather API Setup Script
# This script helps you configure the OpenWeatherMap API key for the weather agent

echo "🌤️  Weather Agent API Setup"
echo "================================="
echo ""

# Check if API key is provided as argument
if [ -z "$1" ]; then
    echo "Usage: $0 <your-openweathermap-api-key>"
    echo ""
    echo "Example:"
    echo "  $0 your-api-key-here"
    echo ""
    echo "To get an API key:"
    echo "  1. Visit https://openweathermap.org/api"
    echo "  2. Sign up for a free account"
    echo "  3. Generate an API key"
    echo ""
    exit 1
fi

API_KEY="$1"

echo "Setting up weather API with key: ${API_KEY:0:8}..."
echo ""

# Initialize the weather API
echo "📡 Calling canister to set API key..."
dfx canister call agent-registry hasApiKey "(\"openweathermap\")"

if [ $? -eq 0 ]; then
    echo "✅ Weather API key configured successfully!"
else
    echo "❌ Failed to configure weather API key"
    exit 1
fi
