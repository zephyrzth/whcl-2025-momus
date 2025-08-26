# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Backend: add get_list_agents() API that proxies Agent Registry's get_list_agents and returns the raw RegistryReturnType.
- Frontend: load agent list dynamically from backend in Marketplace and Canvas; add generic agent node type for unknown agent kinds.
- Frontend: add prompt widget to Canvas that calls backend execute_prompt and displays ok/err.

- Backend: add execute_prompt(prompt) that reads connected agents from user canvas, builds JSON request with prompt, connected_agent_list, and user principal, and delegates to agentic-client-agent execute_task returning raw ReturnType.

- Add header user menu showing Principal ID, wallet Account ID, and ICP balance (local ledger), with copy actions and live fetch on open.

- Auto-register newly deployed agents: after deploy_from_chunks, query agent get_metadata to obtain name and register with Agent Registry canister.

### Added

- Add WASM upload button in Agent Marketplace for deploying gzipped WASM files
- Add chunked file upload support for WASM deployment with progress tracking
- Add Motoko backend APIs to upload raw WASM in chunks and deploy to a new canister (single-shot install, 0.7T cycles)

### Changed

- Remove Weather Demo menu and functionality
- Replace single-file upload with chunked upload method for WASM deployment

### Fixed

- Fix canvas state not being properly isolated between different user identities
- Fix initial canvas state showing default agents for new users instead of an empty canvas

### Added

- Add per-user CanvasState storage and access in backend, isolating canvas data by logged-in ICP identity.
- Integrate ICP Ledger (ICRC-1/2) payments in Planner Agent: charge caller in ICP via icrc2_transfer_from, split 90% to agent owner and 10% app fee via icrc1_transfer. Default price set to 0.01 ICP.
- Extend AgentInterface with get_owner/get_price and implement in Weather and AirQuality agents.

### Added

- Add Python agent creation feature with file upload and Pyodide compilation
- Add experimental Python Kybra canister `agentic-backend` with persistent greeting storage
- Improve loading indicator with circular spinner design and smoother animation
- Integrate Internet Identity authentication replacing email/password system
- Replace email/password authentication with ICP Principal-based authentication system
- Add user authentication system with login and registration using Motoko backend
- Add client-side routing with React Router for protected and public routes
- Add session management with 15-minute timeout for authenticated users
- Move Weather Demo, Marketplace, and Canvas features behind authentication
- Revamp frontend UI with modern SaaS landing page inspired by Saasfly template
- Add proper header navigation with professional branding and menu structure
- Create hero section with compelling call-to-action and feature highlights
- Enhance README with comprehensive architecture documentation, technical diagrams, and deployment guides
- Add agent execution engine with canvas-based workflow routing for connected agents
- Add canvas validation to ensure proper agent connections before execution
- Replace default agent buttons with dropdown selector in Agent Canvas including Weather Agent, Client Agent, and Air Quality Agent options
- Improve Momus logo presentation by increasing size and removing spinning animation
- Replace React logo with Momus branding and update homepage link
- Simplify Demo Pages to focus on LLM functionality by removing greeting and counter sections
- Add dedicated Weather Agent with real-time weather information and API key management

### Changed

- Fix authentication to properly handle different Internet Identity sessions and display full principal IDs
- Modify Agent Canvas test execution to route directly to planner agent instead of using canvas routing logic

- Add structured weather data parser for OpenWeatherMap API responses with typed Motoko records
- Add HTTP outcalls implementation for real-time weather data fetching from OpenWeatherMap API
- Add public wrapper function for direct LLM weather agent testing and debugging
- Add AI-powered weather agent with live OpenWeatherMap API integration and intelligent clothing recommendations via LLM
- Add navigation menu bar with Home, LLM, and Counter options for easy view switching
- Add Agent Marketplace with trending agents for purchase and integration into canvas
- Add React Flow canvas for agentic AI workflow design with drag & drop nodes

### Changed

- Simplify Agent Marketplace by removing purchase functionality and showing only agent titles and descriptions
- Add backend persistent storage for agent canvas state with positions, connections, and attributes
- Add frontend integration with backend canvas state management including error handling and loading states
- Add set_count update method to allow setting the counter to a specific value
- Add frontend development server scripts (`npm run start`)
- Add LLM canister implementation
- Add centralized AgentRegistry canister for proper separation of concerns
- Add comprehensive deployment script that handles everything in one command

### Changed

- Update dependencies to latest versions
- Switched the template to Motoko for writing the backend canister
- Rewrote the devcontainer setup
- Rewrote the tests
- Rewrote the npm scripts
- Rewrote the e2e workflow
- Fix mops installation in CI workflow by using npx
- Refactor agent registry from embedded class to standalone canister for better architecture separation

## [0.1.0] - 2025-04-24

### Added

- Basic canister structure with Rust
- Counter functionality with increment and get_count methods
- Greeting functionality
- PocketIC testing infrastructure
- Vitest test runner configuration
- GitHub CI workflow for automated end-to-end tests for all methods
- Project documentation
- Add custom instructions for github copilot
