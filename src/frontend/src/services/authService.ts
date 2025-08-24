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
  private currentPrincipalId: string | null = null;

  async init(): Promise<void> {
    this.authClient = await AuthClient.create({
      idleOptions: {
        disableIdle: true, // Disable idle logout for simplicity
      },
    });
    // Initialize current principal ID
    this.currentPrincipalId = this.getPrincipalId();
  }

  hasIdentityChanged(): boolean {
    const currentId = this.getPrincipalId();
    const changed = currentId !== this.currentPrincipalId;
    if (changed) {
      console.log(
        "[AUTH] Identity changed from",
        this.currentPrincipalId,
        "to",
        currentId,
      );
      this.currentPrincipalId = currentId;
    }
    return changed;
  }

  getPrincipalId(): string | null {
    if (!this.authClient) return null;
    const identity = this.authClient.getIdentity();
    const principalId = identity.getPrincipal().toString();
    console.log("[DEBUG] Auth Service - Current Principal ID:", principalId);
    return principalId;
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
      console.log("[DEBUG] Auth Service - Logging out current user");
      if (this.authClient) {
        await this.authClient.logout();
        // Destroy the auth client instance to ensure fresh state for next login
        this.authClient = null;
      }
      this.clearAuth();
      await this.init(); // Reinitialize auth client after logout
      return { success: true, data: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local auth even if logout fails
      this.clearAuth();
      // Also destroy auth client on error
      this.authClient = null;
      return { success: true, data: true };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      if (!this.authClient) {
        await this.init();
      }
      const isAuth = this.authClient?.isAuthenticated() || false;
      if (isAuth) {
        const principalId = this.getPrincipalId();
        console.log("[DEBUG] Auth Check - Authenticated:", {
          principalId,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log("[DEBUG] Auth Check - Not authenticated");
      }
      return isAuth;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }

  async getOrCreateUserProfile(): Promise<ServiceResult<User>> {
    try {
      const currentPrincipalId = this.getPrincipalId();
      if (!currentPrincipalId) {
        return { success: false, error: "No authenticated user found" };
      }

      // First try to get existing profile
      const profileResult = await backend.getUserProfile();

      if ("ok" in profileResult) {
        const user: User = {
          principalId: currentPrincipalId,
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
        const currentPrincipalId = this.getPrincipalId();
        if (!currentPrincipalId) {
          return { success: false, error: "No authenticated user found" };
        }

        const createResult = await backend.createUserProfile([]);

        if ("ok" in createResult) {
          const user: User = {
            principalId: currentPrincipalId,
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
      const currentPrincipalId = this.getPrincipalId();
      if (!currentPrincipalId) {
        return { success: false, error: "No authenticated user found" };
      }

      const result = await backend.updateUserProfile([displayName]);

      if ("ok" in result) {
        const user: User = {
          principalId: currentPrincipalId,
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
    this.currentPrincipalId = null;
  }
}

// Export singleton instance
export const authService = new AuthService();
