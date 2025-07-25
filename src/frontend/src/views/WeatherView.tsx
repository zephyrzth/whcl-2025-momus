import React, { useState, useEffect } from "react";
import { backendService } from "../services/backendService";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { Card } from "../components/Card";
import { Loader } from "../components/Loader";
import { ErrorDisplay } from "../components/ErrorDisplay";

export const WeatherView: React.FC = () => {
  const [cityInput, setCityInput] = useState("");
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [weatherData, setWeatherData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Check if API is configured on component mount
  useEffect(() => {
    checkApiConfiguration();
  }, []);

  const checkApiConfiguration = async () => {
    try {
      const configured = await backendService.isWeatherApiConfigured();
      setIsApiConfigured(configured);
    } catch (err) {
      console.error("Failed to check API configuration:", err);
      setError("Failed to check API configuration");
    }
  };

  const handleConfigureApi = async () => {
    if (!apiKeyInput.trim()) {
      setError("Please enter a valid API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await backendService.initWeatherApi(apiKeyInput);
      setIsApiConfigured(true);
      setShowApiKeyInput(false);
      setApiKeyInput("");
    } catch (err) {
      console.error("Failed to configure API:", err);
      setError("Failed to configure weather API");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetWeatherByCity = async () => {
    if (!cityInput.trim()) {
      setError("Please enter a city name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await backendService.getWeatherByCity(cityInput);
      setWeatherData(response);
    } catch (err) {
      console.error("Failed to get weather by city:", err);
      setError("Failed to get weather data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetWeatherByCoordinates = async () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);

    if (isNaN(lat) || isNaN(lon)) {
      setError("Please enter valid latitude and longitude values");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90");
      return;
    }

    if (lon < -180 || lon > 180) {
      setError("Longitude must be between -180 and 180");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await backendService.getWeatherByCoordinates(lat, lon);
      setWeatherData(response);
    } catch (err) {
      console.error("Failed to get weather by coordinates:", err);
      setError("Failed to get weather data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-800">
            🌤️ Weather Agent
          </h1>
          <p className="text-gray-600">
            Get live weather data and smart clothing recommendations
          </p>
        </div>

        {/* API Configuration Status */}
        <Card title="API Configuration">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold">API Status:</span>
              {isApiConfigured === null ? (
                <Loader />
              ) : isApiConfigured ? (
                <span className="font-medium text-green-600">
                  ✅ Configured
                </span>
              ) : (
                <span className="font-medium text-red-600">
                  ❌ Not Configured
                </span>
              )}
            </div>
            {!isApiConfigured && (
              <Button onClick={() => setShowApiKeyInput(!showApiKeyInput)}>
                Configure API
              </Button>
            )}
          </div>

          {showApiKeyInput && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">
                Enter your OpenWeatherMap API key. Get one free at{" "}
                <a
                  href="https://openweathermap.org/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  openweathermap.org
                </a>
              </p>
              <div className="flex gap-2">
                <InputField
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleConfigureApi}
                  disabled={isLoading || !apiKeyInput.trim()}
                >
                  {isLoading ? <Loader /> : "Configure"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Weather Input Forms */}
        {isApiConfigured && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* City Input */}
            <Card title="🏙️ Weather by City">
              <div className="space-y-3">
                <InputField
                  placeholder="Enter city name (e.g., London, Tokyo)"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                />
                <Button
                  onClick={handleGetWeatherByCity}
                  disabled={isLoading || !cityInput.trim()}
                  className="w-full"
                >
                  {isLoading ? <Loader /> : "Get Weather"}
                </Button>
              </div>
            </Card>

            {/* Coordinates Input */}
            <Card title="📍 Weather by Coordinates">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    type="number"
                    placeholder="Latitude"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                  />
                  <InputField
                    type="number"
                    placeholder="Longitude"
                    value={lonInput}
                    onChange={(e) => setLonInput(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleGetWeatherByCoordinates}
                  disabled={isLoading || !latInput.trim() || !lonInput.trim()}
                  className="w-full"
                >
                  {isLoading ? <Loader /> : "Get Weather"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Error Display */}
        {error && <ErrorDisplay message={error} />}

        {/* Weather Results */}
        {weatherData && (
          <Card title="🌡️ Weather & Clothing Recommendation">
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-6">
                <div className="whitespace-pre-wrap text-blue-900">
                  {weatherData}
                </div>
              </div>
            </div>
          </Card>
        )}

        {!isApiConfigured && (
          <Card title="🔧 Setup Required">
            <div className="py-8 text-center">
              <div className="mb-4 text-6xl">🔧</div>
              <h3 className="mb-2 text-xl font-semibold">
                API Configuration Required
              </h3>
              <p className="mb-4 text-gray-600">
                Please configure your OpenWeatherMap API key to use the weather
                agent.
              </p>
              <Button onClick={() => setShowApiKeyInput(true)}>
                Configure API Key
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
