import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, DashboardLayout } from "./components";
import {
  LandingPage,
  LoginView,
  RegisterView,
  AgentCanvasView,
  AgentMarketplaceView,
  UsageView,
} from "./views";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage onNavigate={() => {}} />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />

          {/* Protected Routes */}
          <Route
            path="/canvas"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="min-h-screen bg-gray-900 py-8">
                    <div className="container mx-auto px-4">
                      <div className="mx-auto max-w-7xl">
                        <div className="mb-8 text-center">
                          <h1 className="mb-4 text-3xl font-bold text-white">
                            Visual Agent Canvas
                          </h1>
                          <p className="text-gray-300">
                            Connect and orchestrate AI agents in powerful
                            workflows
                          </p>
                        </div>
                        <AgentCanvasView
                          onError={() => {}}
                          setLoading={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <DashboardLayout>
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
                          onError={() => {}}
                          setLoading={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/usage"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="min-h-screen bg-gray-900 py-8">
                    <div className="container mx-auto px-4">
                      <div className="mx-auto max-w-6xl">
                        <UsageView />
                      </div>
                    </div>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect for authenticated users */}
          <Route
            path="/dashboard"
            element={<Navigate to="/canvas" replace />}
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
