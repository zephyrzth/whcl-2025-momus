import { backend } from "../../../declarations/backend";
import type { CanvasState } from "../types/canvas";

export interface CanvasOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Canvas state management service that interacts with the backend canister
 */
export class CanvasService {
  /**
   * Save canvas state to the backend
   */
  static async saveCanvasState(
    state: CanvasState,
  ): Promise<CanvasOperationResult> {
    try {
      const result = await backend.save_canvas_state(state);
      if (result) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to save canvas state" };
      }
    } catch (error) {
      console.error("Error saving canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while saving canvas state",
      };
    }
  }

  /**
   * Load canvas state from the backend
   */
  static async loadCanvasState(): Promise<
    CanvasOperationResult<CanvasState | null>
  > {
    try {
      const result = await backend.get_canvas_state();
      return {
        success: true,
        data: result.length > 0 ? result[0] : null,
      };
    } catch (error) {
      console.error("Error loading canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while loading canvas state",
      };
    }
  }

  /**
   * Clear canvas state from the backend
   */
  static async clearCanvasState(): Promise<CanvasOperationResult> {
    try {
      const result = await backend.clear_canvas_state();
      if (result) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to clear canvas state" };
      }
    } catch (error) {
      console.error("Error clearing canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while clearing canvas state",
      };
    }
  }

  /**
   * Check if canvas has saved state
   */
  static async hasCanvasState(): Promise<CanvasOperationResult<boolean>> {
    try {
      const result = await backend.has_canvas_state();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error checking canvas state:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while checking canvas state",
      };
    }
  }
}
