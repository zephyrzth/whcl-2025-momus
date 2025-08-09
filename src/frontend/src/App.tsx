import { useState } from "react";

// Import components and views
import { Header, Footer, Loader, ErrorDisplay } from "./components";
import {
  LandingPage,
  AgentCanvasView,
  AgentMarketplaceView,
  WeatherView,
} from "./views";

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState<
    "home" | "features" | "canvas" | "marketplace" | "weather"
  >("home");

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setLoading(false);
  };

  const handleNavigate = (page: string) => {
    setError(undefined);
    setCurrentPage(page as typeof currentPage);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "home":
      case "features":
        return <LandingPage onNavigate={handleNavigate} />;

      case "weather":
        return (
          <div className="min-h-screen bg-gray-900 py-8">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-4xl">
                <div className="mb-8 text-center">
                  <h1 className="mb-4 text-3xl font-bold text-white">
                    Weather Intelligence Agent
                  </h1>
                  <p className="text-gray-300">
                    Get AI-powered weather insights and recommendations
                  </p>
                </div>
                <WeatherView />
              </div>
            </div>
          </div>
        );

      case "marketplace":
        return (
          <div className="min-h-screen bg-gray-900 py-8">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-6xl">
                <div className="mb-8 text-center">
                  <h1 className="mb-4 text-3xl font-bold text-white">
                    Agent Marketplace
                  </h1>
                  <p className="text-gray-300">
                    Discover and integrate powerful AI agents
                  </p>
                </div>
                <AgentMarketplaceView
                  onError={handleError}
                  setLoading={setLoading}
                />
              </div>
            </div>
          </div>
        );

      case "canvas":
        return (
          <div className="min-h-screen bg-gray-900 py-8">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-7xl">
                <div className="mb-8 text-center">
                  <h1 className="mb-4 text-3xl font-bold text-white">
                    Visual Agent Canvas
                  </h1>
                  <p className="text-gray-300">
                    Connect and orchestrate AI agents in powerful workflows
                  </p>
                </div>
                <AgentCanvasView
                  onError={handleError}
                  setLoading={setLoading}
                />
              </div>
            </div>
          </div>
        );

      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />

      <main className="flex-1">
        {renderContent()}

        {/* Global Loading and Error States */}
        {loading && !error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="rounded-lg bg-gray-800 p-8">
              <Loader />
            </div>
          </div>
        )}

        {!!error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-gray-800 p-8">
              <ErrorDisplay message={error} />
              <button
                onClick={() => setError(undefined)}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
