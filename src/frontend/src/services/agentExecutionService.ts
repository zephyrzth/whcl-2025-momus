import { backend } from "../../../declarations/backend";
import type { CanvasState, AgentNode } from "../types/canvas";
import { CanvasService } from "./canvasService";

export interface ExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
  executionPath?: string[];
}

export interface AgentCapability {
  agentType: string;
  capabilities: string[];
  description: string;
}

/**
 * Agent execution service that routes messages between connected agents
 * based on the canvas configuration
 */
export class AgentExecutionService {
  private static agentCapabilities: AgentCapability[] = [
    {
      agentType: "clientAgent",
      capabilities: ["routing", "orchestration", "user_interaction"],
      description: "Routes user requests to appropriate specialized agents",
    },
    {
      agentType: "weatherAgent",
      capabilities: ["weather", "temperature", "forecast", "climate"],
      description: "Provides weather information and forecasts",
    },
    {
      agentType: "airQualityAgent",
      capabilities: [
        "air_quality",
        "air quality",
        "pollution",
        "aqi",
        "environmental",
      ],
      description: "Provides air quality and environmental data",
    },
    {
      agentType: "dataAgent",
      capabilities: ["data_processing", "analytics", "reporting"],
      description: "Processes and analyzes data",
    },
  ];

  /**
   * Execute a user prompt using the current canvas configuration
   */
  static async executePrompt(prompt: string): Promise<ExecutionResult> {
    try {
      // Load current canvas state
      const canvasResult = await CanvasService.loadCanvasState();
      if (!canvasResult.success || !canvasResult.data) {
        return {
          success: false,
          error:
            "No canvas configuration found. Please set up agents and connections first.",
        };
      }

      const canvasState = canvasResult.data;

      // Validate canvas configuration
      const validationResult = this.validateCanvasForExecution(canvasState);
      if (!validationResult.success) {
        return validationResult;
      }

      // Find client agent (entry point)
      const clientAgent = canvasState.nodes.find(
        (node) => node.nodeType === "clientAgent",
      );

      if (!clientAgent) {
        return {
          success: false,
          error:
            "Client agent not found. Please add a client agent to handle user requests.",
        };
      }

      // Execute the prompt through the agent workflow
      return await this.routePromptThroughAgents(
        prompt,
        canvasState,
        clientAgent,
      );
    } catch (error) {
      console.error("Error executing prompt:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown execution error",
      };
    }
  }

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
  private static async routePromptThroughAgents(
    prompt: string,
    canvasState: CanvasState,
    clientAgent: AgentNode,
  ): Promise<ExecutionResult> {
    const executionPath: string[] = [clientAgent.agentLabel];

    try {
      // Find agents connected to the client agent
      const connectedAgents = this.getConnectedAgents(
        clientAgent.id,
        canvasState,
      );

      if (connectedAgents.length === 0) {
        return {
          success: false,
          error: "Client agent has no connected specialized agents.",
        };
      }

      // Determine which agent should handle the prompt
      const targetAgent = this.determineTargetAgent(prompt, connectedAgents);

      if (!targetAgent) {
        return {
          success: false,
          error: "No suitable agent found to handle this request.",
          executionPath,
        };
      }

      executionPath.push(targetAgent.agentLabel);

      // Route to the appropriate backend agent based on type
      let response: string;

      switch (targetAgent.nodeType) {
        case "weatherAgent":
          response = await this.executeWeatherAgent(prompt);
          break;
        case "airQualityAgent":
          response = await this.executeAirQualityAgent(prompt);
          break;
        case "dataAgent":
          response = await this.executeDataAgent(prompt);
          break;
        default:
          throw new Error(`Unsupported agent type: ${targetAgent.nodeType}`);
      }

      return {
        success: true,
        response,
        executionPath,
      };
    } catch (error) {
      console.error("Error in agent routing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Agent execution error",
        executionPath,
      };
    }
  }

  /**
   * Get agents connected to a specific agent (bidirectional)
   */
  private static getConnectedAgents(
    agentId: string,
    canvasState: CanvasState,
  ): AgentNode[] {
    // Find connections where the agent is either source or target
    const connections = canvasState.connections.filter(
      (conn) => conn.source === agentId || conn.target === agentId,
    );

    // Get the connected agent IDs (excluding the agent itself)
    const connectedAgentIds = connections.map((conn) =>
      conn.source === agentId ? conn.target : conn.source,
    );

    return connectedAgentIds
      .map((id) => canvasState.nodes.find((node) => node.id === id))
      .filter((node): node is AgentNode => node !== undefined);
  }

  /**
   * Determine which agent should handle the prompt based on capabilities
   */
  private static determineTargetAgent(
    prompt: string,
    availableAgents: AgentNode[],
  ): AgentNode | null {
    const promptLower = prompt.toLowerCase();

    // Simple keyword matching - can be enhanced with ML in the future
    for (const agent of availableAgents) {
      const capability = this.agentCapabilities.find(
        (cap) => cap.agentType === agent.nodeType,
      );

      if (capability) {
        for (const keyword of capability.capabilities) {
          // Normalize both prompt and keyword for better matching
          const normalizedKeyword = keyword.toLowerCase().replace(/_/g, " ");
          const normalizedPrompt = promptLower.replace(/_/g, " ");

          if (normalizedPrompt.includes(normalizedKeyword)) {
            return agent;
          }
        }
      }
    }

    // Default to first available agent if no specific match
    return availableAgents[0] || null;
  }

  /**
   * Execute weather agent request
   */
  private static async executeWeatherAgent(prompt: string): Promise<string> {
    // Extract location from prompt (simple implementation)
    const locationMatch =
      prompt.match(/in\s+([a-zA-Z\s]+?)[\?\.]/i) ||
      prompt.match(/for\s+([a-zA-Z\s]+?)[\?\.]/i) ||
      prompt.match(/([a-zA-Z\s]+)\s+weather/i);

    const location = locationMatch ? locationMatch[1].trim() : "Jakarta";

    try {
      const result = await backend.get_weather_via_http_outcall(location, "");

      if ("ok" in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      throw new Error(`Weather service error: ${error}`);
    }
  }

  /**
   * Execute air quality agent request
   */
  private static async executeAirQualityAgent(
    _prompt: string,
  ): Promise<string> {
    // For now, return a placeholder response
    // This would be connected to actual air quality API in the future
    return "Air quality data is currently unavailable. This agent will be connected to environmental data sources in future updates.";
  }

  /**
   * Execute data agent request
   */
  private static async executeDataAgent(_prompt: string): Promise<string> {
    // For now, return a placeholder response
    // This would be connected to data processing capabilities in the future
    return "Data processing capabilities are currently unavailable. This agent will be enhanced with analytics features in future updates.";
  }

  /**
   * Get agent capabilities for UI display
   */
  static getAgentCapabilities(): AgentCapability[] {
    return this.agentCapabilities;
  }

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
