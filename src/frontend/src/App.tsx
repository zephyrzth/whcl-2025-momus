import { useState } from "react";
import MomusLogo from "../assets/momus.webp";

// Import components and views
import { Loader, ErrorDisplay } from "./components";
import {
  LlmPromptView,
  AgentCanvasView,
  AgentMarketplaceView,
  WeatherView,
} from "./views";

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState<
    "home" | "canvas" | "marketplace" | "weather"
  >("home");

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-800 text-white">
        <div className="mx-auto w-full max-w-4xl space-y-8 p-8 text-center">
          <div className="mb-8">
            <a href="/" rel="noreferrer">
              <img
                src={MomusLogo}
                className="mx-auto h-80 p-6 will-change-[filter] hover:drop-shadow-[0_0_2em_#61dafbaa]"
                alt="Momus logo"
              />
            </a>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl">Marketplace of Autonomous AI Agents</h2>
          </div>

          {/* Navigation */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage("home")}
              className={`rounded px-6 py-2 font-medium transition-colors ${
                currentPage === "home"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              Demo Pages
            </button>
            <button
              onClick={() => setCurrentPage("weather")}
              className={`rounded px-6 py-2 font-medium transition-colors ${
                currentPage === "weather"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              Weather Agent
            </button>
            <button
              onClick={() => setCurrentPage("marketplace")}
              className={`rounded px-6 py-2 font-medium transition-colors ${
                currentPage === "marketplace"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              Agent Marketplace
            </button>
            <button
              onClick={() => setCurrentPage("canvas")}
              className={`rounded px-6 py-2 font-medium transition-colors ${
                currentPage === "canvas"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}
            >
              Agent Canvas
            </button>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            {currentPage === "home" && (
              <>
                {/* LLM Prompt Section */}
                <LlmPromptView onError={handleError} setLoading={setLoading} />
              </>
            )}

            {currentPage === "weather" && (
              <>
                {/* Weather Agent Section */}
                <WeatherView />
              </>
            )}

            {currentPage === "marketplace" && (
              <>
                {/* Agent Marketplace Section */}
                <AgentMarketplaceView
                  onError={handleError}
                  setLoading={setLoading}
                />
              </>
            )}

            {currentPage === "canvas" && (
              <>
                {/* Agent Canvas Section */}
                <AgentCanvasView
                  onError={handleError}
                  setLoading={setLoading}
                />
              </>
            )}
          </div>

          {/* Loading and Error States */}
          {loading && !error && <Loader />}
          {!!error && <ErrorDisplay message={error} />}
        </div>
      </div>
    </>
  );
}

export default App;
