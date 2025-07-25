import { backend } from "../../../declarations/backend";
import type { WeatherResponse } from "../../../declarations/backend/backend.did";

/**
 * Service for handling all backend canister API calls
 */
export const backendService = {
  /**
   * Sends a greeting to the backend and returns the response
   * @param name Name to greet
   * @returns Promise with the greeting response
   */
  async greet(name: string): Promise<string> {
    return await backend.greet(name || "World");
  },

  /**
   * Fetches the current counter value
   * @returns Promise with the current count
   */
  async getCount(): Promise<bigint> {
    return await backend.get_count();
  },

  /**
   * Increments the counter on the backend
   * @returns Promise with the new count
   */
  async incrementCounter(): Promise<bigint> {
    return await backend.increment();
  },

  /**
   * Sends a prompt to the LLM backend
   * @param prompt The user's prompt text
   * @returns Promise with the LLM response
   */
  async sendLlmPrompt(prompt: string): Promise<string> {
    return await backend.prompt(prompt);
  },

  // Weather Agent Methods
  /**
   * Initializes the weather API with the provided API key
   * @param apiKey OpenWeatherMap API key
   * @returns Promise that resolves when the API key is set
   */
  async initWeatherApi(apiKey: string): Promise<void> {
    return await backend.init_weather_api(apiKey);
  },

  /**
   * Checks if the weather API is configured with an API key
   * @returns Promise with boolean indicating if API is configured
   */
  async isWeatherApiConfigured(): Promise<boolean> {
    return await backend.is_weather_api_configured();
  },

  /**
   * Gets weather data and clothing recommendations for a city
   * @param location City name (e.g., "London", "New York")
   * @returns Promise with weather data and clothing recommendations
   */
  async getWeatherByCity(location: string): Promise<WeatherResponse> {
    return await backend.get_weather_with_recommendations(location);
  },

  /**
   * Gets weather data and clothing recommendations for coordinates
   * @param lat Latitude
   * @param lon Longitude
   * @returns Promise with weather data and clothing recommendations
   */
  async getWeatherByCoordinates(
    lat: number,
    lon: number,
  ): Promise<WeatherResponse> {
    return await backend.get_weather_by_coordinates(lat, lon);
  },
};
