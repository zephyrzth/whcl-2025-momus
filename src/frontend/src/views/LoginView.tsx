import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader, ErrorDisplay } from "../components";

export function LoginView() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleLogin = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await login();

      if (result.success) {
        // Redirect to the intended page or canvas by default
        const from = (location.state as any)?.from?.pathname || "/canvas";
        navigate(from, { replace: true });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            to="/"
            className="mb-4 inline-flex items-center text-sm text-gray-400 hover:text-gray-300"
          >
            ← Back to Home
          </Link>
          <h2 className="text-3xl font-bold text-white">Sign in to Momus</h2>
          <p className="mt-2 text-gray-300">Access your AI agent workspace</p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md border border-red-800 bg-red-900/20 p-4">
              <ErrorDisplay message={error} />
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="font-inherit focus:outline-auto w-full cursor-pointer rounded-lg border border-blue-500 bg-blue-600 px-5 py-3 text-base font-medium text-white transition-colors duration-200 hover:border-blue-400 hover:bg-blue-700 focus:outline-4 focus:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader /> : "Sign in with Internet Identity"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Don't have an Internet Identity?{" "}
              <a
                href="https://identity.ic0.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                Create one here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
