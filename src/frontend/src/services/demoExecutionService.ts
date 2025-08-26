import { AgentExecutionService } from "./agentExecutionService";

/**
 * Service for demo pages to use canvas-based agent execution
 */
export class DemoExecutionService {
  /**
   * Execute a prompt using the current canvas configuration
   * This is the main interface for demo pages
   */
  static async executeUserPrompt(_prompt: string): Promise<{ success: false; error: string }> {
    // Execution removed from frontend
    return { success: false, error: "Agent execution has been removed from the frontend." };
  }

  /**
   * Check if the canvas is properly configured for demo execution
   */
  static async isDemoReady(): Promise<{ ready: boolean; message: string }> {
    const canvasStatus = await AgentExecutionService.isCanvasReady();

    if (canvasStatus.ready) {
      return {
        ready: true,
        message: "Canvas is configured and ready for agent execution",
      };
    }

    return {
      ready: false,
      message: `Canvas configuration issues: ${canvasStatus.issues.join(", ")}. Please configure your agents in the Agent Canvas.`,
    };
  }

  /**
   * Get suggested setup for demo pages
   */
  static getSuggestedSetup(): {
    title: string;
    description: string;
    steps: string[];
  } {
    return {
      title: "Setup Agent Canvas for Demo",
      description:
        "To use the demo features, configure your agent workflow in the Agent Canvas:",
      steps: [
        "1. Go to Agent Canvas from the navigation menu",
        "2. Add a Client Agent (entry point for user requests)",
        "3. Add specialized agents (Weather Agent, Air Quality Agent, etc.)",
        "4. Connect the Client Agent to the specialized agents",
        "5. Save your canvas configuration",
        "6. Test the execution in the canvas to verify it works",
        "7. Return to demo pages to interact with your configured agents",
      ],
    };
  }
}
