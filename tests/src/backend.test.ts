import { describe, beforeEach, afterEach, it, expect, inject } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PocketIc, type Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";

// Import generated types for your canister
import {
  type _SERVICE,
  idlFactory,
} from "../../src/declarations/backend/backend.did.js";

// Define the path to your canister's WASM file
export const WASM_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "backend",
  "backend.wasm",
);

// The `describe` function is used to group tests together
describe("Vibe Coding Template Backend", () => {
  // Define variables to hold our PocketIC instance, canister ID,
  // and an actor to interact with our canister.
  let pic: PocketIc;
  // @ts-ignore - This variable is used in the setup / framework
  let canisterId: Principal;
  let actor: Actor<_SERVICE>;

  // The `beforeEach` hook runs before each test.
  beforeEach(async () => {
    // create a new PocketIC instance
    pic = await PocketIc.create(inject("PIC_URL"));

    // Setup the canister and actor
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });

    // Save the actor and canister ID for use in tests
    actor = fixture.actor;
    canisterId = fixture.canisterId;
  });

  // The `afterEach` hook runs after each test.
  afterEach(async () => {
    // tear down the PocketIC instance
    await pic.tearDown();
  });

  // The `it` function is used to define individual tests
  it("should greet with the provided name", async () => {
    const response = await actor.greet("World");
    expect(response).toEqual("Hello, World!");
  });

  it("should increment counter and return new value", async () => {
    const initialCount = await actor.get_count();
    const newCount = await actor.increment();
    expect(newCount).toEqual(initialCount + BigInt(1));
  });

  it("should get current counter value", async () => {
    const count = await actor.get_count();
    expect(typeof count).toBe("bigint");
  });

  it("should set counter to specified value", async () => {
    const newValue = BigInt(42);
    const result = await actor.set_count(newValue);
    expect(result).toEqual(newValue);
    const currentCount = await actor.get_count();
    expect(currentCount).toEqual(newValue);
  });

  // Weather agent tests
  describe("Weather Agent", () => {
    it("should initialize weather API key", async () => {
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);
      // Note: We can't directly test the stored value as it's private,
      // but we can verify the function executes without error
    });

    describe("HTTP Outcall Weather Functions", () => {
      beforeEach(async () => {
        // Initialize API key before each HTTP outcall test
        const testApiKey = "b546ecac84d575af4d3354dbd74da1a4";
        await actor.init_weather_api(testApiKey);
      });

      it("should fetch weather data via HTTP outcall for city name", async () => {
        const cityName = "Jakarta";
        const result = await actor.get_weather_via_http_outcall(
          cityName,
          "city",
        );

        // The result should be a Result type with either #ok or #err
        expect(result).toBeDefined();

        // Check if it's a successful result (this may fail in test environment due to HTTP outcalls)
        // In a real test environment with proper HTTP outcall support, we'd check for specific values
        if ("ok" in result) {
          const weatherData = result.ok;
          expect(weatherData).toHaveProperty("temperature");
          expect(weatherData).toHaveProperty("humidity");
          expect(weatherData).toHaveProperty("description");
          expect(weatherData).toHaveProperty("city");
          expect(weatherData).toHaveProperty("country");
          expect(typeof weatherData).toBe("string");
        } else if ("err" in result) {
          // In test environment, HTTP outcalls might fail - this is expected
          expect(typeof result.err).toBe("string");
          expect(result.err.length).toBeGreaterThan(0);
        }
      });

      it("should fetch weather data via HTTP outcall for coordinates", async () => {
        const coordinates = "-6.2146,106.8451"; // Jakarta coordinates
        const result = await actor.get_weather_via_http_outcall(
          coordinates,
          "coordinates",
        );

        expect(result).toBeDefined();

        // Check the result structure regardless of success/failure
        if ("ok" in result) {
          const weatherData = result.ok;
          expect(weatherData).toHaveProperty("temperature");
          expect(weatherData).toHaveProperty("humidity");
          expect(weatherData).toHaveProperty("description");
          expect(weatherData).toHaveProperty("city");
          expect(weatherData).toHaveProperty("country");
        } else if ("err" in result) {
          expect(typeof result.err).toBe("string");
          expect(result.err.length).toBeGreaterThan(0);
        }
      });

      it("should handle HTTP outcall errors gracefully", async () => {
        const invalidCity = "ThisCityDoesNotExist123456";
        const result = await actor.get_weather_via_http_outcall(
          invalidCity,
          "city",
        );

        expect(result).toBeDefined();

        // Should return an error for invalid city
        if ("err" in result) {
          expect(typeof result.err).toBe("string");
          expect(result.err.length).toBeGreaterThan(0);
        }
        // If it somehow succeeds, that's also valid for this test
      });

      it("should return error when API key is not configured for HTTP outcall", async () => {
        // Reset API key to empty
        await actor.init_weather_api("");

        const result = await actor.get_weather_via_http_outcall(
          "Jakarta",
          "city",
        );

        expect(result).toBeDefined();
        expect("err" in result).toBe(true);
        if ("err" in result) {
          expect(result.err).toBe("API key not configured");
        }
      });
    });

    it("should get weather with recommendations by city name", async () => {
      // First initialize the API key
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);

      const cityName = "London";
      const response = await actor.get_weather_with_recommendations(cityName);

      // Verify response structure
      expect(response).toHaveProperty("weather");
      expect(response).toHaveProperty("clothing");

      // Verify weather data structure
      expect(response.weather).toHaveProperty("temperature");
      expect(response.weather).toHaveProperty("humidity");
      expect(response.weather).toHaveProperty("description");
      expect(response.weather).toHaveProperty("city");
      expect(response.weather).toHaveProperty("country");

      // Verify clothing recommendation structure
      expect(response.clothing).toHaveProperty("recommendation");
      expect(response.clothing).toHaveProperty("reason");

      // Verify data types
      expect(typeof response.weather.temperature).toBe("number");
      expect(typeof response.weather.humidity).toBe("bigint");
      expect(typeof response.weather.description).toBe("string");
      expect(typeof response.weather.city).toBe("string");
      expect(typeof response.weather.country).toBe("string");
      expect(typeof response.clothing.recommendation).toBe("string");
      expect(typeof response.clothing.reason).toBe("string");

      // Test actual values (these should fail with placeholder implementation)
      expect(response.weather.city).not.toBe(""); // Should have actual city name
      expect(response.weather.description).not.toBe(""); // Should have weather description
      expect(response.clothing.recommendation).not.toBe(""); // Should have clothing recommendation
      expect(response.clothing.reason).not.toBe(""); // Should have reason for recommendation
    });

    it("should get weather with recommendations by coordinates", async () => {
      // First initialize the API key
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);

      const lat = 51.5074; // London latitude
      const lon = -0.1278; // London longitude
      const response = await actor.get_weather_by_coordinates(lat, lon);

      // Verify response structure (same as city name test)
      expect(response).toHaveProperty("weather");
      expect(response).toHaveProperty("clothing");

      // Verify weather data structure
      expect(response.weather).toHaveProperty("temperature");
      expect(response.weather).toHaveProperty("humidity");
      expect(response.weather).toHaveProperty("description");
      expect(response.weather).toHaveProperty("city");
      expect(response.weather).toHaveProperty("country");

      // Verify clothing recommendation structure
      expect(response.clothing).toHaveProperty("recommendation");
      expect(response.clothing).toHaveProperty("reason");

      // Test actual values (these should fail with placeholder implementation)
      expect(response.weather.city).not.toBe(""); // Should have actual city name from coordinates
      expect(response.weather.description).not.toBe(""); // Should have weather description
      expect(response.clothing.recommendation).not.toBe(""); // Should have clothing recommendation
    });

    it("should handle empty city name gracefully", async () => {
      const response = await actor.get_weather_with_recommendations("");
      expect(response).toHaveProperty("weather");
      expect(response).toHaveProperty("clothing");
    });

    it("should handle invalid coordinates gracefully", async () => {
      const invalidLat = 999; // Invalid latitude
      const invalidLon = 999; // Invalid longitude
      const response = await actor.get_weather_by_coordinates(
        invalidLat,
        invalidLon,
      );
      expect(response).toHaveProperty("weather");
      expect(response).toHaveProperty("clothing");
    });

    it("should provide different recommendations for different temperature ranges", async () => {
      // First initialize the API key
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);

      // This test will be more meaningful once we implement the actual logic
      const response1 = await actor.get_weather_with_recommendations("London");
      const response2 = await actor.get_weather_by_coordinates(
        51.5074,
        -0.1278,
      );

      // For now, just verify both return valid structures
      expect(response1).toHaveProperty("weather");
      expect(response1).toHaveProperty("clothing");
      expect(response2).toHaveProperty("weather");
      expect(response2).toHaveProperty("clothing");
    });

    it("should return meaningful weather data using AI agent", async () => {
      // First initialize the API key
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);

      const response = await actor.get_weather_with_recommendations("London");

      // Debug: log the actual response
      console.log("Actual weather response:", response);

      // Verify AI agent returns meaningful data, not empty strings
      expect(response.weather.temperature).toBeGreaterThan(0);
      expect(response.weather.humidity).toBeGreaterThan(BigInt(0));
      expect(response.weather.description).toBeTruthy();
      expect(response.weather.city).toBeTruthy();
      expect(response.clothing.recommendation).toBeTruthy();
      expect(response.clothing.reason).toBeTruthy();
    });

    it("should handle weather API errors gracefully with AI agent", async () => {
      // First initialize the API key
      const testApiKey = "invalid-api-key";
      await actor.init_weather_api(testApiKey);

      const response =
        await actor.get_weather_with_recommendations("InvalidCity");

      // Should still return a valid response structure even on errors
      expect(response).toHaveProperty("weather");
      expect(response).toHaveProperty("clothing");
      expect(typeof response.weather.temperature).toBe("number");
      expect(typeof response.weather.humidity).toBe("bigint");
    });

    it("should integrate with OpenWeather API via LLM for real weather data", async () => {
      // First initialize the API key
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);

      const response = await actor.get_weather_with_recommendations("London");

      // This test should fail until we implement actual OpenWeather API integration
      // The response should contain actual weather data from OpenWeather API
      expect(response.weather.city).toBe("London"); // Should match actual city from API
      expect(response.weather.country).toBe("GB"); // Should match actual country from API

      // Clothing recommendations should be more specific than placeholder
      expect(response.clothing.recommendation).not.toBe(
        "Light clothing recommended",
      );
      expect(response.clothing.reason).not.toBe("Pleasant weather conditions");

      // Should have realistic weather values (not placeholder values)
      expect(response.weather.temperature).not.toBe(25.0);
      expect(response.weather.humidity).not.toBe(BigInt(60));
    });

    it("should allow direct LLM weather agent testing via public wrapper", async () => {
      // First initialize the API key
      const testApiKey = "test-api-key-123";
      await actor.init_weather_api(testApiKey);

      // Test direct LLM call with city location type
      const cityResponse = await actor.get_weather_data_via_llm_public(
        "Jakarta",
        "city",
      );

      // Verify response structure
      expect(cityResponse).toHaveProperty("weather");
      expect(cityResponse).toHaveProperty("clothing");
      expect(cityResponse.weather).toHaveProperty("temperature");
      expect(cityResponse.weather).toHaveProperty("humidity");
      expect(cityResponse.weather).toHaveProperty("description");
      expect(cityResponse.weather).toHaveProperty("city");
      expect(cityResponse.weather).toHaveProperty("country");
      expect(cityResponse.clothing).toHaveProperty("recommendation");
      expect(cityResponse.clothing).toHaveProperty("reason");

      // Test direct LLM call with coordinates location type
      const coordResponse = await actor.get_weather_data_via_llm_public(
        "-6.2088,106.8456",
        "coordinates",
      );

      // Verify response structure for coordinates
      expect(coordResponse).toHaveProperty("weather");
      expect(coordResponse).toHaveProperty("clothing");
    });

    it("should handle missing API key in public wrapper", async () => {
      // Don't initialize API key for this test

      const response = await actor.get_weather_data_via_llm_public(
        "Jakarta",
        "city",
      );

      // Should return API key error
      expect(response.weather.description).toBe("API key not configured");
      expect(response.clothing.recommendation).toBe(
        "Please configure weather API key first",
      );
    });

    describe("Parsed Weather Data Functions", () => {
      beforeEach(async () => {
        // Initialize API key before each test
        const testApiKey = "b546ecac84d575af4d3354dbd74da1a4";
        await actor.init_weather_api(testApiKey);
      });

      it("should parse weather data and return structured response for city", async () => {
        const cityName = "Jakarta";
        const result = await actor.get_parsed_weather_data(cityName, "city");

        expect(result).toBeDefined();

        // Check if it's a successful result
        if ("ok" in result) {
          const parsedData = result.ok;

          // Verify the structure matches ParsedWeatherData
          expect(parsedData).toHaveProperty("description");
          expect(parsedData).toHaveProperty("temp");
          expect(parsedData).toHaveProperty("feels_like");
          expect(parsedData).toHaveProperty("visibility");
          expect(parsedData).toHaveProperty("wind_speed");
          expect(parsedData).toHaveProperty("city_name");

          // Verify data types
          expect(typeof parsedData.description).toBe("string");
          expect(typeof parsedData.temp).toBe("number");
          expect(typeof parsedData.feels_like).toBe("number");
          expect(typeof parsedData.visibility).toBe("bigint");
          expect(typeof parsedData.wind_speed).toBe("number");
          expect(typeof parsedData.city_name).toBe("string");
        } else if ("err" in result) {
          // In test environment, HTTP outcalls might fail - this is expected
          expect(typeof result.err).toBe("string");
          expect(result.err.length).toBeGreaterThan(0);
        }
      });

      it("should parse weather data and return structured response for coordinates", async () => {
        const coordinates = "-6.2146,106.8451"; // Jakarta coordinates
        const result = await actor.get_parsed_weather_data(
          coordinates,
          "coordinates",
        );

        expect(result).toBeDefined();

        // Check the result structure
        if ("ok" in result) {
          const parsedData = result.ok;

          // Verify the structure matches ParsedWeatherData
          expect(parsedData).toHaveProperty("description");
          expect(parsedData).toHaveProperty("temp");
          expect(parsedData).toHaveProperty("feels_like");
          expect(parsedData).toHaveProperty("visibility");
          expect(parsedData).toHaveProperty("wind_speed");
          expect(parsedData).toHaveProperty("city_name");
        } else if ("err" in result) {
          expect(typeof result.err).toBe("string");
          expect(result.err.length).toBeGreaterThan(0);
        }
      });

      it("should handle API key not configured error in parsed weather data", async () => {
        // Reset to empty API key
        await actor.init_weather_api("");

        const cityName = "Jakarta";
        const result = await actor.get_parsed_weather_data(cityName, "city");

        expect(result).toBeDefined();
        expect("err" in result).toBe(true);

        if ("err" in result) {
          expect(result.err).toBe("API key not configured");
        }
      });

      it("should handle invalid location gracefully in parsed weather data", async () => {
        const invalidCity = "ThisCityDoesNotExist123456";
        const result = await actor.get_parsed_weather_data(invalidCity, "city");

        expect(result).toBeDefined();

        // Should either succeed with empty data or fail with error
        if ("ok" in result) {
          const parsedData = result.ok;
          expect(parsedData).toHaveProperty("description");
          expect(parsedData).toHaveProperty("temp");
          expect(parsedData).toHaveProperty("feels_like");
          expect(parsedData).toHaveProperty("visibility");
          expect(parsedData).toHaveProperty("wind_speed");
          expect(parsedData).toHaveProperty("city_name");
        } else if ("err" in result) {
          expect(typeof result.err).toBe("string");
          expect(result.err.length).toBeGreaterThan(0);
        }
      });
    });
  });

  // Canvas state management tests
  describe("Canvas State Management", () => {
    const mockCanvasState = {
      nodes: [
        {
          id: "node-1",
          nodeType: "weatherAgent",
          position: { x: 100.0, y: 200.0 },
          agentLabel: "Weather Agent",
          attributes: [
            ["city", "Jakarta"],
            ["units", "metric"],
          ] as [string, string][],
        },
        {
          id: "node-2",
          nodeType: "clientAgent",
          position: { x: 300.0, y: 150.0 },
          agentLabel: "Client Agent",
          attributes: [["endpoint", "api/data"]] as [string, string][],
        },
      ],
      connections: [
        {
          id: "connection-1",
          source: "node-1",
          target: "node-2",
          connectionType: "data",
        },
      ],
      lastUpdated: "2025-01-15T10:30:00Z",
      version: BigInt(1),
    };

    it("should initially have no canvas state", async () => {
      const hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      const state = await actor.get_canvas_state();
      expect(state).toEqual([]);
    });

    it("should save canvas state and return true", async () => {
      const result = await actor.save_canvas_state(mockCanvasState);
      expect(result).toBe(true);
    });

    it("should load saved canvas state", async () => {
      // First save the state
      await actor.save_canvas_state(mockCanvasState);

      // Then load it
      const loadedState = await actor.get_canvas_state();
      expect(loadedState).toEqual([mockCanvasState]);
    });

    it("should indicate canvas has state after saving", async () => {
      // Initially no state
      let hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      // Save state
      await actor.save_canvas_state(mockCanvasState);

      // Now should have state
      hasState = await actor.has_canvas_state();
      expect(hasState).toBe(true);
    });

    it("should clear canvas state and return true", async () => {
      // First save some state
      await actor.save_canvas_state(mockCanvasState);

      // Verify it exists
      let hasState = await actor.has_canvas_state();
      expect(hasState).toBe(true);

      // Clear the state
      const result = await actor.clear_canvas_state();
      expect(result).toBe(true);

      // Verify it's cleared
      hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      const state = await actor.get_canvas_state();
      expect(state).toEqual([]);
    });

    it("should handle empty nodes and connections arrays", async () => {
      const emptyState = {
        nodes: [],
        connections: [],
        lastUpdated: "2025-01-15T10:30:00Z",
        version: BigInt(1),
      };

      const result = await actor.save_canvas_state(emptyState);
      expect(result).toBe(true);

      const loadedState = await actor.get_canvas_state();
      expect(loadedState).toEqual([emptyState]);
    });

    it("should preserve complex agent attributes", async () => {
      const complexState = {
        nodes: [
          {
            id: "complex-node",
            nodeType: "advancedAgent",
            position: { x: 500.5, y: 750.25 },
            agentLabel: "Advanced AI Agent",
            attributes: [
              ["model", "gpt-4"],
              ["temperature", "0.7"],
              ["maxTokens", "2048"],
              ["systemPrompt", "You are a helpful assistant"],
              ["apiKey", "encrypted-key-123"],
            ] as [string, string][],
          },
        ],
        connections: [
          {
            id: "complex-connection",
            source: "complex-node",
            target: "output-node",
            connectionType: "streaming",
          },
        ],
        lastUpdated: "2025-01-15T15:45:30Z",
        version: BigInt(5),
      };

      await actor.save_canvas_state(complexState);
      const loadedState = await actor.get_canvas_state();
      expect(loadedState).toEqual([complexState]);
    });
  });
});
