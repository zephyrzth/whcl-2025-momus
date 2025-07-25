import { describe, it, expect, vi, beforeEach } from "vitest";
import { backendService } from "../../src/services/backendService";
import { backend } from "../../../declarations/backend";

// Mock the backend module
vi.mock("../../../declarations/backend", () => ({
  backend: {
    init_weather_api: vi.fn(),
    is_weather_api_configured: vi.fn(),
    get_weather_with_recommendations: vi.fn(),
    get_weather_by_coordinates: vi.fn(),
  },
}));

describe("backendService - Weather Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initWeatherApi", () => {
    it("should call backend.init_weather_api with correct parameters", async () => {
      const apiKey = "test-api-key-123";

      await backendService.initWeatherApi(apiKey);

      expect(backend.init_weather_api).toHaveBeenCalledWith(apiKey);
      expect(backend.init_weather_api).toHaveBeenCalledTimes(1);
    });
  });

  describe("isWeatherApiConfigured", () => {
    it("should return true when API is configured", async () => {
      const mockResponse = true;
      vi.mocked(backend.is_weather_api_configured).mockResolvedValue(
        mockResponse,
      );

      const result = await backendService.isWeatherApiConfigured();

      expect(result).toBe(true);
      expect(backend.is_weather_api_configured).toHaveBeenCalledTimes(1);
    });

    it("should return false when API is not configured", async () => {
      const mockResponse = false;
      vi.mocked(backend.is_weather_api_configured).mockResolvedValue(
        mockResponse,
      );

      const result = await backendService.isWeatherApiConfigured();

      expect(result).toBe(false);
      expect(backend.is_weather_api_configured).toHaveBeenCalledTimes(1);
    });
  });

  describe("getWeatherByCity", () => {
    it("should call backend.get_weather_with_recommendations with city name", async () => {
      const cityName = "London";
      const mockResponse = {
        weather: {
          temperature: 15.5,
          humidity: BigInt(75),
          description: "Partly cloudy",
          city: "London",
          country: "UK",
        },
        clothing: {
          recommendation: "Light jacket recommended",
          reason: "Cool temperature with high humidity",
        },
      };

      vi.mocked(backend.get_weather_with_recommendations).mockResolvedValue(
        mockResponse,
      );

      const result = await backendService.getWeatherByCity(cityName);

      expect(result).toEqual(mockResponse);
      expect(backend.get_weather_with_recommendations).toHaveBeenCalledWith(
        cityName,
      );
      expect(backend.get_weather_with_recommendations).toHaveBeenCalledTimes(1);
    });

    it("should handle empty city name", async () => {
      const cityName = "";
      const mockResponse = {
        weather: {
          temperature: 0.0,
          humidity: BigInt(0),
          description: "API key not configured",
          city: "",
          country: "",
        },
        clothing: {
          recommendation: "Please configure weather API key first",
          reason: "Weather data unavailable",
        },
      };

      vi.mocked(backend.get_weather_with_recommendations).mockResolvedValue(
        mockResponse,
      );

      const result = await backendService.getWeatherByCity(cityName);

      expect(result).toEqual(mockResponse);
      expect(backend.get_weather_with_recommendations).toHaveBeenCalledWith(
        cityName,
      );
    });
  });

  describe("getWeatherByCoordinates", () => {
    it("should call backend.get_weather_by_coordinates with correct parameters", async () => {
      const lat = 51.5074;
      const lon = -0.1278;
      const mockResponse = {
        weather: {
          temperature: 18.2,
          humidity: BigInt(65),
          description: "Clear sky",
          city: "London",
          country: "GB",
        },
        clothing: {
          recommendation: "T-shirt and light pants",
          reason: "Warm and comfortable weather",
        },
      };

      vi.mocked(backend.get_weather_by_coordinates).mockResolvedValue(
        mockResponse,
      );

      const result = await backendService.getWeatherByCoordinates(lat, lon);

      expect(result).toEqual(mockResponse);
      expect(backend.get_weather_by_coordinates).toHaveBeenCalledWith(lat, lon);
      expect(backend.get_weather_by_coordinates).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid coordinates", async () => {
      const lat = 999; // Invalid latitude
      const lon = 999; // Invalid longitude
      const mockResponse = {
        weather: {
          temperature: 0.0,
          humidity: BigInt(0),
          description: "Invalid coordinates",
          city: "",
          country: "",
        },
        clothing: {
          recommendation: "Unable to provide recommendation",
          reason: "Invalid location data",
        },
      };

      vi.mocked(backend.get_weather_by_coordinates).mockResolvedValue(
        mockResponse,
      );

      const result = await backendService.getWeatherByCoordinates(lat, lon);

      expect(result).toEqual(mockResponse);
      expect(backend.get_weather_by_coordinates).toHaveBeenCalledWith(lat, lon);
    });
  });

  describe("error handling", () => {
    it("should propagate errors from backend service", async () => {
      const errorMessage = "Network error";
      vi.mocked(backend.is_weather_api_configured).mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(backendService.isWeatherApiConfigured()).rejects.toThrow(
        errorMessage,
      );
    });

    it("should propagate errors from weather API calls", async () => {
      const errorMessage = "API rate limit exceeded";
      vi.mocked(backend.get_weather_with_recommendations).mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(backendService.getWeatherByCity("London")).rejects.toThrow(
        errorMessage,
      );
    });
  });
});
