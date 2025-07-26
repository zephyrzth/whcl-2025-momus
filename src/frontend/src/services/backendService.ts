import { backend } from "../../../declarations/backend";
import { agent_weather_agent } from "../../../declarations/agent-weather_agent";

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
   * Note: This functionality may need to be implemented in the weather agent
   * @param apiKey OpenWeatherMap API key
   * @returns Promise that resolves when the API key is set
   */
  async initWeatherApi(apiKey: string): Promise<void> {
    // TODO: Implement weather API initialization in weather agent
    console.log("Weather API initialization not yet implemented", apiKey);
  },

  /**
   * Checks if the weather API is configured with an API key
   * @returns Promise with boolean indicating if API is configured
   */
  async isWeatherApiConfigured(): Promise<boolean> {
    return await agent_weather_agent.is_weather_api_configured();
  },

  /**
   * Gets weather data and clothing recommendations for a city using the execute_task function
   * @param location City name (e.g., "London", "New York")
   * @returns Promise with weather recommendations as text
   */
  async getWeatherByCity(location: string): Promise<string> {
    const prompt = `How is the weather today in ${location}?`;
    return await agent_weather_agent.execute_task(prompt);
  },

  /**
   * Gets weather data and clothing recommendations for coordinates using the execute_task function
   * @param lat Latitude
   * @param lon Longitude
   * @returns Promise with weather recommendations as text
   */
  async getWeatherByCoordinates(lat: number, lon: number): Promise<string> {
    const prompt = `How is the weather at coordinates ${lat}, ${lon}?`;
    return await agent_weather_agent.execute_task(prompt);
  },
};
