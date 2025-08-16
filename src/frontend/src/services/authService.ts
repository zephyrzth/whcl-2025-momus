import { backend } from "../../../declarations/backend";
import { AuthClient } from "@dfinity/auth-client";

// Types for authentication
export interface User {
  principalId: string; // Store as string to avoid type conflicts
  displayName?: string;
  createdAt: string; // Store as string for serialization
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AuthService {
  private authClient: AuthClient | null = null;
  private static readonly USER_KEY = "momus_user";

  async init(): Promise<void> {
    this.authClient = await AuthClient.create({
      idleOptions: {
        disableIdle: true, // Disable idle logout for simplicity
      },
    });
  }

  async login(): Promise<ServiceResult<User>> {
    try {
      if (!this.authClient) {
        await this.init();
      }

      if (!this.authClient) {
        return { success: false, error: "Failed to initialize auth client" };
      }

      return new Promise((resolve) => {
        this.authClient!.login({
          identityProvider:
            process.env.DFX_NETWORK === "local"
              ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943/`
              : "https://identity.ic0.app",
          onSuccess: async () => {
            try {
              // Get or create user profile
              const userResult = await this.getOrCreateUserProfile();
              if (userResult.success && userResult.data) {
                this.storeUser(userResult.data);
                resolve({ success: true, data: userResult.data });
              } else {
                resolve({
                  success: false,
                  error: userResult.error || "Failed to get user profile",
                });
              }
            } catch (error) {
              console.error("Error after login:", error);
              resolve({
                success: false,
                error: error instanceof Error ? error.message : "Login failed",
              });
            }
          },
          onError: (error) => {
            console.error("Internet Identity login error:", error);
            resolve({
              success: false,
              error: error || "Internet Identity login failed",
            });
          },
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  }

  async logout(): Promise<ServiceResult<boolean>> {
    try {
      if (this.authClient) {
        await this.authClient.logout();
      }
      this.clearAuth();
      return { success: true, data: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local auth even if logout fails
      this.clearAuth();
      return { success: true, data: true };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      if (!this.authClient) {
        await this.init();
      }
      return this.authClient?.isAuthenticated() || false;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }

  async getOrCreateUserProfile(): Promise<ServiceResult<User>> {
    try {
      // First try to get existing profile
      const profileResult = await backend.getUserProfile();

      if ("ok" in profileResult) {
        const user: User = {
          principalId: profileResult.ok.principalId.toString(),
          displayName: profileResult.ok.displayName[0] || undefined,
          createdAt: profileResult.ok.createdAt.toString(),
        };
        return { success: true, data: user };
      }

      // If profile doesn't exist, create one
      if (
        "err" in profileResult &&
        profileResult.err === "User profile not found"
      ) {
        const createResult = await backend.createUserProfile([]);

        if ("ok" in createResult) {
          const user: User = {
            principalId: createResult.ok.principalId.toString(),
            displayName: createResult.ok.displayName[0] || undefined,
            createdAt: createResult.ok.createdAt.toString(),
          };
          return { success: true, data: user };
        } else {
          return { success: false, error: createResult.err };
        }
      }

      return { success: false, error: profileResult.err };
    } catch (error) {
      console.error("Error getting/creating user profile:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get user profile",
      };
    }
  }

  async updateUserProfile(displayName: string): Promise<ServiceResult<User>> {
    try {
      const result = await backend.updateUserProfile([displayName]);

      if ("ok" in result) {
        const user: User = {
          principalId: result.ok.principalId.toString(),
          displayName: result.ok.displayName[0] || undefined,
          createdAt: result.ok.createdAt.toString(),
        };
        this.storeUser(user);
        return { success: true, data: user };
      } else {
        return { success: false, error: result.err };
      }
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      };
    }
  }

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

  private storeUser(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  clearAuth(): void {
    localStorage.removeItem(AuthService.USER_KEY);
  }
}

// Export singleton instance
export const authService = new AuthService();
