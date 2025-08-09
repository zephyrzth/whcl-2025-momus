# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
