import type { CanvasState } from "../types/canvas";
import { CanvasService } from "./canvasService";

export interface ExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
  executionPath?: string[];
}

// Note: All agent execution/mapping capabilities have been removed from the frontend.

/**
 * Agent execution service that routes messages between connected agents
 * based on the canvas configuration
 */
export class AgentExecutionService {

  /**
   * Execute a user prompt using the current canvas configuration
   */
  // Execution routing has been removed.

  /**
   * Execute a test prompt directly through the planner agent (bypassing canvas routing)
   * This is used specifically for the Agent Canvas test execution feature
   */
  // Test prompt execution has been removed.

  /**
   * Validate canvas configuration for execution
   */
  static validateCanvasForExecution(canvasState: CanvasState): ExecutionResult {
    const { nodes, connections } = canvasState;

    // Check if there are any nodes
    if (nodes.length === 0) {
      return {
        success: false,
        error:
          "No agents found on canvas. Please add agents to create a workflow.",
      };
    }

    // Check for client agent
    const clientAgents = nodes.filter(
      (node) => node.nodeType === "clientAgent",
    );
    if (clientAgents.length === 0) {
      return {
        success: false,
        error:
          "Client agent required. Please add a client agent as the entry point.",
      };
    }

    if (clientAgents.length > 1) {
      return {
        success: false,
        error:
          "Multiple client agents found. Please use only one client agent as the entry point.",
      };
    }

    // Check if client agent has connections (either as source or target)
    const clientAgent = clientAgents[0];

    // Check for connections where client is either source OR target
    const clientConnections = connections.filter(
      (conn) =>
        conn.source === clientAgent.id || conn.target === clientAgent.id,
    );

    if (clientConnections.length === 0) {
      return {
        success: false,
        error:
          "Client agent must be connected to at least one specialized agent (Weather, Air Quality, etc.).",
      };
    }

    // Validate that connected agents exist
    const connectedAgentIds = new Set(
      connections.flatMap((conn) => [conn.source, conn.target]),
    );
    const nodeIds = new Set(nodes.map((node) => node.id));

    for (const agentId of connectedAgentIds) {
      if (!nodeIds.has(agentId)) {
        return {
          success: false,
          error: `Connected agent with ID "${agentId}" not found on canvas.`,
        };
      }
    }

    return { success: true };
  }

  /**
   * Route prompt through connected agents based on canvas configuration
   */
  // Routing and agent selection removed.

  /**
   * Get agents connected to a specific agent (bidirectional)
   */
  // Connection helpers for routing removed.

  /**
   * Determine which agent should handle the prompt based on capabilities
   */
  // Target agent determination removed.

  /**
   * Execute weather agent request
   */
  // Weather agent execution removed.

  /**
   * Execute air quality agent request
   */
  // Air quality agent execution removed.

  /**
   * Execute data agent request
   */
  // Data agent execution removed.

  /**
   * Get agent capabilities for UI display
   */
  // Agent capability listing removed.

  /**
   * Check if canvas is ready for execution
   */
  static async isCanvasReady(): Promise<{ ready: boolean; issues: string[] }> {
    try {
      const canvasResult = await CanvasService.loadCanvasState();
      if (!canvasResult.success || !canvasResult.data) {
        return {
          ready: false,
          issues: ["No canvas configuration found"],
        };
      }

      const validationResult = this.validateCanvasForExecution(
        canvasResult.data,
      );
      if (!validationResult.success) {
        return {
          ready: false,
          issues: [validationResult.error || "Canvas validation failed"],
        };
      }

      return { ready: true, issues: [] };
    } catch (error) {
      return {
        ready: false,
        issues: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }
}
