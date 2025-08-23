import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService, User } from "../services/authService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    displayName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize auth client
      await authService.init();

      // Check if user is already authenticated with Internet Identity
      const isAuth = await authService.isAuthenticated();

      if (isAuth) {
        // Try to get current user profile from localStorage first
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // If no user in localStorage but authenticated, get/create profile
          try {
            const result = await authService.getOrCreateUserProfile();
            if (result.success && result.data) {
              setUser(result.data);
            }
          } catch (error) {
            console.error("Error getting user profile:", error);
            // If profile fetch fails, logout to clear state
            await authService.logout();
            setUser(null);
          }
        }
      } else {
        // Not authenticated, clear any stale localStorage data
        authService.clearAuth();
        setUser(null);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const result = await authService.login();

      if (result.success && result.data) {
        setUser(result.data);
        console.log("[DEBUG] User logged in: ", result.data);
        return { success: true };
      } else {
        return { success: false, error: result.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear the user state even if backend call fails
      setUser(null);
    }
  };

  const updateProfile = async (displayName: string) => {
    try {
      const result = await authService.updateUserProfile(displayName);

      if (result.success && result.data) {
        setUser(result.data);
        return { success: true };
      } else {
        return { success: false, error: result.error || "Update failed" };
      }
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
