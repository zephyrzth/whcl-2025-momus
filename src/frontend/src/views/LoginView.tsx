import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { InputField, Loader, ErrorDisplay } from "../components";

export function LoginView() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        setError(result.error || "Login failed");
      }
      // Success case is handled by the AuthContext redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, password: e.target.value }));
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md border border-red-800 bg-red-900/20 p-4">
              <ErrorDisplay message={error} />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Email address
              </label>
              <InputField
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                className="mr-0 w-full"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Password
              </label>
              <InputField
                type="password"
                value={formData.password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                className="mr-0 w-full"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="font-inherit focus:outline-auto w-full cursor-pointer rounded-lg border border-blue-500 bg-blue-600 px-5 py-3 text-base font-medium text-white transition-colors duration-200 hover:border-blue-400 hover:bg-blue-700 focus:outline-4 focus:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader /> : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-300">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
