# 🚀 Quick Start Guide

Get your IC Agent System up and running in under 5 minutes!

## Prerequisites

- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) installed
- [Node.js](https://nodejs.org/) (v16+) installed
- [Mops](https://mops.one/) installed (`npm install -g ic-mops`)

## Instant Setup

### 1. Configure Environment (Optional)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your OpenWeatherMap API key (optional)
# Get free key from: https://openweathermap.org/api
nano .env
```

### 2. Deploy Everything

```bash
# One command to rule them all! 🚀
./scripts/deploy-all.sh
```

This script will:

- ✅ Install all dependencies
- ✅ Start dfx network
- ✅ Deploy all canisters
- ✅ Configure agent registry
- ✅ Setup weather API (if key provided)
- ✅ Run integration tests
- ✅ Show you all URLs and test commands

### 3. Start Frontend Development

```bash
npm start
```

Your app will be available at `http://localhost:5173`

## Test Commands

After deployment, try these commands:

```bash
# Test agent communication
dfx canister call agent-planner_agent execute_task '("How is the air quality in Jakarta?")'

# Test weather (if API key configured)
dfx canister call backend get_weather_with_recommendations '("London")'

# Check agent registry status
dfx canister call agent-planner_agent getAllAgentCanisters
```

## Troubleshooting

### Script Options

```bash
./scripts/deploy-all.sh --help          # Show all options
./scripts/deploy-all.sh --skip-weather  # Skip weather API setup
./scripts/deploy-all.sh --skip-tests    # Skip integration tests
```

### Common Issues

**DFX not starting?**

```bash
dfx stop
./scripts/deploy-all.sh
```

**Want to reset everything?**

```bash
dfx stop
dfx start --clean
./scripts/deploy-all.sh
```

**Missing weather functionality?**

- Add your OpenWeatherMap API key to `.env`
- Run: `dfx canister call backend init_weather_api '("your-api-key")'`

## What's Deployed?

After successful deployment, you'll have:

- 🌐 **Frontend**: React app with agent marketplace and canvas
- 🤖 **Planner Agent**: Routes requests to specialized agents
- 🌬️ **Air Quality Agent**: Provides air quality information
- 🌤️ **Weather Service**: Live weather data and recommendations
- 🧠 **LLM Service**: Intelligent request processing

## Next Steps

1. **Explore the Frontend**: Visit the local URL shown after deployment
2. **Add More Agents**: Use the agent marketplace to discover new capabilities
3. **Customize Workflows**: Use the visual canvas to design agent interactions
4. **Build Your App**: Extend the template with your own features

Happy coding! 🎉
