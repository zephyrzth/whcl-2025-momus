import { backend } from "../../../declarations/backend";

// Types for authentication
export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

// Service result types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AuthService {
  private static readonly TOKEN_KEY = "momus_auth_token";
  private static readonly USER_KEY = "momus_user";

  // Register a new user
  async register(
    credentials: RegisterCredentials,
  ): Promise<ServiceResult<AuthResponse>> {
    try {
      const result = await backend.register(
        credentials.email,
        credentials.password,
      );

      if ("ok" in result) {
        const authResponse: AuthResponse = {
          user: {
            id: result.ok.user.id,
            email: result.ok.user.email,
          },
          token: result.ok.token,
        };

        this.storeAuth(authResponse);
        return { success: true, data: authResponse };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }

  // Login user
  async login(
    credentials: LoginCredentials,
  ): Promise<ServiceResult<AuthResponse>> {
    try {
      const result = await backend.login(
        credentials.email,
        credentials.password,
      );

      if ("ok" in result) {
        const authResponse: AuthResponse = {
          user: result.ok.user,
          token: result.ok.token,
        };

        this.storeAuth(authResponse);
        return { success: true, data: authResponse };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  }

  // Logout user
  async logout(): Promise<ServiceResult<boolean>> {
    try {
      const token = this.getToken();
      if (token) {
        await backend.logout(token);
      }

      this.clearAuth();
      return { success: true, data: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local storage even if backend call fails
      this.clearAuth();
      return { success: true, data: true };
    }
  }

  // Validate current session
  async validateSession(): Promise<ServiceResult<User>> {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, error: "No token found" };
      }

      const result = await backend.validateSession(token);

      if ("ok" in result) {
        // Update stored user info
        this.storeUser(result.ok);
        return { success: true, data: result.ok };
      } else {
        // Session invalid, clear local storage
        this.clearAuth();
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Session validation error:", error);
      this.clearAuth();
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Session validation failed",
      };
    }
  }

  // Refresh session
  async refreshSession(): Promise<ServiceResult<string>> {
    try {
      const token = this.getToken();
      if (!token) {
        return { success: false, error: "No token found" };
      }

      const result = await backend.refreshSession(token);

      if ("ok" in result) {
        this.storeToken(result.ok);
        return { success: true, data: result.ok };
      } else {
        this.clearAuth();
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Session refresh error:", error);
      this.clearAuth();
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Session refresh failed",
      };
    }
  }

  // Get current user from local storage
  getCurrentUser(): User | null {
    try {
      const userJson = localStorage.getItem(AuthService.USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Get current token
  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getToken() !== null && this.getCurrentUser() !== null;
  }

  // Private methods for local storage management
  private storeAuth(authResponse: AuthResponse): void {
    this.storeToken(authResponse.token);
    this.storeUser(authResponse.user);
  }

  private storeToken(token: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, token);
  }

  private storeUser(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  private clearAuth(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
  }
}

// Export singleton instance
export const authService = new AuthService();
