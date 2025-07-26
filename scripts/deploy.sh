#!/bin/bash

echo "1️⃣ Deploying dependencies..."
dfx deps pull
dfx deps deploy

# Build all canisters first
echo "2️⃣  Building all canisters..."
dfx build

# Deploy all canisters
echo "3️⃣ Deploying all canisters..."
dfx deploy

# Wait and verify deployment completed
echo "   Verifying deployment completed..."
sleep 30

echo
echo "4️⃣ Getting agent canister IDs..."

# Get all agent canisters dynamically from dfx.json (exclude agent-registry)
echo "   📋 Discovering agent canisters from dfx.json..."
AGENT_CANISTERS=$(jq -r '.canisters | keys[] | select(startswith("agent-") and . != "agent-registry")' dfx.json | tr '\n' ' ')
REGISTRY_ID=$(dfx canister id agent-registry)

echo "   📋 Found agent canisters:"
for agent in $AGENT_CANISTERS; do
    CANISTER_ID=$(dfx canister id "$agent")
    echo "   - $agent: $CANISTER_ID"
done

echo "   📋 Registry ID: $REGISTRY_ID"

echo
echo "5️⃣ Initializing API keys from .env..."

# Check if .env file exists
if [ -f ".env" ]; then
    echo "   📋 Loading API keys from .env file..."
    
    # Source the .env file
    source .env
    
    # Set OpenWeatherMap API key if it exists
    if [ -n "$OPENWEATHER_API_KEY" ] && [ "$OPENWEATHER_API_KEY" != "your_api_key_here" ]; then
        echo "   Setting OpenWeatherMap API key..."
        dfx canister call agent-registry setApiKey "(\"openweathermap\", \"$OPENWEATHER_API_KEY\")"
        
        if [ $? -eq 0 ]; then
            echo "   ✅ OpenWeatherMap API key set successfully"
        else
            echo "   ❌ Failed to set OpenWeatherMap API key"
        fi
    else
        echo "   ⚠️  OpenWeatherMap API key not found or using placeholder"
    fi
    
    # You can add more API keys here as needed
    # Example:
    # if [ -n "$OTHER_API_KEY" ]; then
    #     dfx canister call agent-registry setApiKey "(\"other_service\", \"$OTHER_API_KEY\")"
    # fi
    
else
    echo "   ⚠️  No .env file found, skipping API key initialization"
    echo "   💡 Create a .env file with your API keys (see .env.example)"
fi

echo
echo "🔟 Registering agents with AgentRegistry..."

# Register each agent
for agent in $AGENT_CANISTERS; do
    CANISTER_ID=$(dfx canister id "$agent")
    echo "   Registering $agent ($CANISTER_ID)..."
    
    dfx canister call agent-registry registerAgent "(\"$CANISTER_ID\")"
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Successfully registered $agent"
    else
        echo "   ❌ Failed to register $agent"
    fi
done

echo
echo "1️⃣1️⃣  Verification - Registered agents:"
dfx canister call agent-registry getAllRegisteredAgents

echo
echo "1️⃣2️⃣  API Key verification:"
echo "   📋 Available API services:"
dfx canister call agent-registry listApiServices "()"

echo
echo "✅ Deployment and registration complete!"
