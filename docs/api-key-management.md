# API Key Management System

This system allows centralized management of API keys through the AgentRegistry, enabling all agents to securely access external service credentials.

## Architecture

1. **AgentRegistry** - Stores and manages API keys centrally
2. **ApiKeyService** - Helper service for agents to retrieve API keys
3. **Deploy Script** - Automatically loads API keys from `.env` file during deployment

## Setup

### 1. Create `.env` File

```bash
# Copy from example
cp .env.example .env

# Edit with your API keys
nano .env
```

### 2. Add API Keys to `.env`

```bash
# OpenWeatherMap API Key
OPENWEATHER_API_KEY=your_actual_api_key_here

# Add more API keys as needed
# OTHER_SERVICE_API_KEY=your_other_key_here
```

### 3. Deploy with API Key Initialization

```bash
./scripts/deploy.sh
```

The deploy script will automatically:

- Load API keys from `.env` file
- Store them in the AgentRegistry
- Verify the setup

## Usage in Agents

### Import the Service

```motoko
import ApiKeyService "../../shared/ApiKeyService";

// In your agent actor
let apiKeyService = ApiKeyService.ApiKeyService("b77ix-eeaaa-aaaaa-qaada-cai"); // Registry canister ID
```

### Get API Key

```motoko
// Simple get (returns ?Text)
let apiKey = await apiKeyService.getApiKey("openweathermap");

// Get with error handling
switch (await apiKeyService.getApiKeyOrFail("openweathermap")) {
    case (#ok(key)) {
        // Use the API key
        let url = "https://api.openweathermap.org/data/2.5/weather?appid=" # key;
    };
    case (#err(error)) {
        // Handle error
        Debug.print("API key error: " # error);
    };
};
```

### Check if API Key Exists

```motoko
if (await apiKeyService.hasApiKey("openweathermap")) {
    // Proceed with API call
} else {
    // Handle missing API key
};
```

## Supported Services

Currently configured services:

- `openweathermap` - OpenWeatherMap API for weather data
- Add more services as needed by updating the deploy script

## Manual API Key Management

You can also manage API keys manually:

```bash
# Set an API key
dfx canister call agent-registry setApiKey "(\"service_name\", \"api_key_value\")"

# Get an API key
dfx canister call agent-registry getApiKey "(\"service_name\")"

# Check if API key exists
dfx canister call agent-registry hasApiKey "(\"service_name\")"

# List all API services
dfx canister call agent-registry listApiServices "()"
```

## Security Notes

- API keys are stored in the AgentRegistry canister's stable memory
- Keys are accessible to all agents via the registry
- Use query calls when possible to reduce costs
- Keys are not exposed in logs or verification output

## Example Integration

Here's how an agent might use the weather API key:

```motoko
import ApiKeyService "../../shared/ApiKeyService";

actor WeatherAgent {
    private let apiKeyService = ApiKeyService.ApiKeyService("b77ix-eeaaa-aaaaa-qaada-cai");

    public func getWeather(city: Text) : async Result.Result<Text, Text> {
        switch (await apiKeyService.getApiKeyOrFail("openweathermap")) {
            case (#ok(apiKey)) {
                let url = "https://api.openweathermap.org/data/2.5/weather?q=" # city # "&appid=" # apiKey;
                // Make HTTP outcall...
                #ok("Weather data for " # city);
            };
            case (#err(error)) {
                #err("Cannot fetch weather: " # error);
            };
        };
    };
};
```

This system provides a secure, centralized way to manage API keys while keeping them accessible to all agents that need them.
