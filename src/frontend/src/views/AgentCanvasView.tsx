import { useCallback, useState, useEffect, useRef, useContext } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "reactflow";
import { AuthContext } from "../contexts/AuthContext";
import { authService } from "../services/authService";

// Import React Flow styles
import "reactflow/dist/style.css";

// Custom node types
import { WeatherAgentNode } from "../components/nodes/WeatherAgentNode";
import { ClientAgentNode } from "../components/nodes/ClientAgentNode";
import { DataAgentNode } from "../components/nodes/DataAgentNode";
import { AirQualityAgentNode } from "../components/nodes/AirQualityAgentNode";
import { GenericAgentNode } from "../components/nodes/GenericAgentNode";
import { CanvasService } from "../services/canvasService";
import { AgentExecutionService } from "../services/agentExecutionService";
import { convertToCanvasState, convertFromCanvasState } from "../types/canvas";
import { Loader } from "../components/Loader";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { TextArea, Button } from "../components";
import { backendService } from "../services/backendService";
import { fetchRegistryAgents } from "../services/agentRegistryService";

interface AgentCanvasViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

// Define node types for React Flow
const nodeTypes = {
  weatherAgent: WeatherAgentNode,
  clientAgent: ClientAgentNode,
  dataAgent: DataAgentNode,
  airQualityAgent: AirQualityAgentNode,
  genericAgent: GenericAgentNode,
};

// Initial empty state
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export function AgentCanvasView({ onError }: AgentCanvasViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState("clientAgent");
  const [prompt, setPrompt] = useState("");
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<{
    type: "ok" | "err";
    value: string;
  } | null>(null);
  const [availableAgents, setAvailableAgents] = useState<
    { agent_name: string; canister_id: string }[]
  >([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  // Execution testing removed
  const [canvasStatus, setCanvasStatus] = useState<{
    ready: boolean;
    issues: string[];
  }>({
    ready: false,
    issues: [],
  });

  // Debounce timer for canvas readiness checks
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      setLoadingAgents(true);
      const res = await fetchRegistryAgents();
      if (res.success) setAvailableAgents(res.data ?? []);
      setLoadingAgents(false);
    };
    loadAgents();
  }, []);

  // Get auth context
  const authContext = useContext(AuthContext);

  // Debug logging for authentication state changes
  useEffect(() => {
    if (authContext?.user) {
      console.log("[DEBUG] Canvas View - Current User:", {
        principalId: authContext.user.principalId,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log("[DEBUG] Canvas View - No authenticated user");
    }
  }, [authContext?.user]);

  // Load canvas state on component mount and when user changes
  useEffect(() => {
    const handleIdentityChange = async () => {
      if (authContext?.user) {
        if (authService.hasIdentityChanged()) {
          console.log("[DEBUG] Identity changed - clearing canvas state");
          setNodes([]);
          setEdges([]);
          // Load fresh state for new identity
          await loadCanvasFromBackend();
        } else {
          console.log(
            "[DEBUG] Loading canvas state for user:",
            authContext.user.principalId,
          );
          await loadCanvasFromBackend();
        }
      }
    };

    handleIdentityChange();
  }, [authContext?.user?.principalId]); // Re-run when user's principal ID changes

  // Check canvas readiness when nodes or edges change (debounced)
  useEffect(() => {
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced check
    debounceRef.current = setTimeout(() => {
      // Inline the canvas readiness check to avoid dependency issues
      try {
        // Create a current canvas state from frontend nodes and edges
        const currentCanvasState = convertToCanvasState(nodes, edges);

        // Validate the current state directly
        const validationResult =
          AgentExecutionService.validateCanvasForExecution(currentCanvasState);

        if (validationResult.success) {
          setCanvasStatus({ ready: true, issues: [] });
        } else {
          setCanvasStatus({
            ready: false,
            issues: [validationResult.error || "Canvas validation failed"],
          });
        }
      } catch (error) {
        console.error("Error checking canvas readiness:", error);
        setCanvasStatus({
          ready: false,
          issues: ["Error checking canvas configuration"],
        });
      }
    }, 100); // 100ms debounce

    // Cleanup function
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [nodes, edges]);

  const checkCanvasReadiness = useCallback(() => {
    try {
      // Create a current canvas state from frontend nodes and edges
      const currentCanvasState = convertToCanvasState(nodes, edges);

      // Validate the current state directly
      const validationResult =
        AgentExecutionService.validateCanvasForExecution(currentCanvasState);

      if (validationResult.success) {
        setCanvasStatus({ ready: true, issues: [] });
      } else {
        setCanvasStatus({
          ready: false,
          issues: [validationResult.error || "Canvas validation failed"],
        });
      }
    } catch (error) {
      console.error("Error checking canvas readiness:", error);
      setCanvasStatus({
        ready: false,
        issues: ["Error checking canvas configuration"],
      });
    }
  }, [nodes, edges]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadCanvasFromBackend = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await CanvasService.loadCanvasState();

      if (result.success) {
        if (result.data) {
          // Load saved state if it exists
          const { nodes: loadedNodes, edges: loadedEdges } =
            convertFromCanvasState(result.data);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
        } else {
          // Clear canvas if no saved state
          setNodes([]);
          setEdges([]);
        }
      } else {
        setError(result.error || "Failed to load canvas state");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges, onError]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Ensure the connection has an ID
      const edgeWithId = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
      };
      setEdges((eds) => addEdge(edgeWithId, eds));
    },
    [setEdges],
  );

  const onAddWeatherAgent = useCallback(() => {
    const newNode: Node = {
      id: `weather-${Date.now()}`,
      type: "weatherAgent",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "Weather Agent" },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onAddClientAgent = useCallback(() => {
    const newNode: Node = {
      id: `client-${Date.now()}`,
      type: "clientAgent",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "Client Agent" },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onAddAirQualityAgent = useCallback(() => {
    const newNode: Node = {
      id: `airquality-${Date.now()}`,
      type: "airQualityAgent",
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: "Air Quality Agent" },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onAddSelectedAgent = useCallback(() => {
    switch (selectedAgent) {
      case "weatherAgent":
        onAddWeatherAgent();
        break;
      case "clientAgent":
        onAddClientAgent();
        break;
      case "airQualityAgent":
        onAddAirQualityAgent();
        break;
      default:
        onAddClientAgent();
    }
  }, [
    selectedAgent,
    onAddWeatherAgent,
    onAddClientAgent,
    onAddAirQualityAgent,
  ]);

  const onAddPurchasedAgent = useCallback(
    (nodeType: string, agentName: string) => {
      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: { label: agentName },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes],
  );

  const mapAgentTypeToNodeType = (agentNameOrType: string): string => {
    const t = agentNameOrType.toLowerCase();
    if (t.includes("weather")) return "weatherAgent";
    if (t.includes("air") && t.includes("quality")) return "airQualityAgent";
    if (t.includes("client")) return "clientAgent";
    if (t.includes("data") || t.includes("analytics")) return "dataAgent";
    return "genericAgent";
  };

  const onSaveCanvas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const canvasState = convertToCanvasState(nodes, edges);
      const result = await CanvasService.saveCanvasState(canvasState);

      if (!result.success) {
        setError(result.error || "Failed to save canvas state");
        onError(result.error || "Failed to save canvas state");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, onError]);

  const onLoadCanvas = useCallback(async () => {
    await loadCanvasFromBackend();
  }, [loadCanvasFromBackend]);

  const onClearCanvas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await CanvasService.clearCanvasState();
      if (result.success) {
        setNodes([]);
        setEdges([]);
      } else {
        setError(result.error || "Failed to clear canvas state");
        onError(result.error || "Failed to clear canvas state");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges, onError]);

  const onExecutePrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    setExecLoading(true);
    setExecResult(null);
    try {
      const res = await backendService.executePrompt(prompt.trim());
      setExecResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setExecLoading(false);
    }
  }, [prompt]);

  // onTestExecution removed

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-700 p-6">
        <h3 className="mb-4 text-xl font-bold">Agentic AI Canvas</h3>

        {/* Error Display */}
        {error && (
          <div className="mb-4">
            <ErrorDisplay message={error} onDismiss={clearError} />
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="mb-4 flex items-center justify-center">
            <Loader />
            <span className="ml-2 text-gray-300">
              Processing canvas operation...
            </span>
          </div>
        )}

        {/* Canvas Controls */}
        <div className="mb-4 space-y-4">
          {/* Prompt Widget */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-300">
              Prompt Widget
            </h4>
            <div className="rounded border border-gray-600 bg-gray-800 p-3">
              <TextArea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type a prompt to execute via backend..."
              />
              <div className="mt-2 flex gap-2">
                <Button onClick={onExecutePrompt} disabled={execLoading}>
                  {execLoading ? "Running..." : "Execute Prompt"}
                </Button>
                <Button
                  onClick={() => setExecResult(null)}
                  disabled={execLoading}
                  className="bg-gray-600 hover:bg-gray-500"
                >
                  Clear Result
                </Button>
              </div>
              {execResult && (
                <div
                  className={`mt-3 rounded p-3 text-sm ${
                    execResult.type === "ok"
                      ? "border border-green-600 bg-green-900/20 text-green-300"
                      : "border border-red-600 bg-red-900/20 text-red-300"
                  }`}
                >
                  <div className="font-semibold">
                    {execResult.type === "ok" ? "Success" : "Error"}
                  </div>
                  <div className="whitespace-pre-wrap">{execResult.value}</div>
                </div>
              )}
            </div>
          </div>
          {/* Default Agents */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-300">
              Default Agents
            </h4>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Agent Type
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="clientAgent">Client Agent</option>
                  <option value="weatherAgent">Weather Agent</option>
                  <option value="airQualityAgent">Air Quality Agent</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={onAddSelectedAgent}
                  disabled={isLoading}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Agent
                </button>
              </div>
            </div>
          </div>

          {/* Available Agents from Registry */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-300">
              Available Agents
            </h4>
            {loadingAgents ? (
              <div className="text-gray-400">Loading agents…</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableAgents.map((a) => (
                  <button
                    key={a.canister_id}
                    onClick={() =>
                      onAddPurchasedAgent(
                        mapAgentTypeToNodeType(a.agent_name),
                        a.agent_name,
                      )
                    }
                    disabled={isLoading}
                    title={a.canister_id}
                    className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add {a.agent_name}
                  </button>
                ))}
                {availableAgents.length === 0 && (
                  <div className="text-gray-400">No agents available.</div>
                )}
              </div>
            )}
          </div>

          {/* Canvas Management */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-300">
              Canvas Management
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onSaveCanvas}
                disabled={isLoading}
                className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Canvas
              </button>
              <button
                onClick={onLoadCanvas}
                disabled={isLoading}
                className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load Canvas
              </button>
              <button
                onClick={onClearCanvas}
                disabled={isLoading}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Canvas
              </button>
            </div>
          </div>

          {/* Canvas Status */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">
                Canvas Status
              </h4>
              <button
                onClick={checkCanvasReadiness}
                disabled={isLoading}
                className="rounded bg-gray-600 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
            <div className="rounded border border-gray-600 bg-gray-800 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    canvasStatus.ready ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    canvasStatus.ready ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {canvasStatus.ready
                    ? "Ready for Execution"
                    : "Configuration Issues"}
                </span>
              </div>
              {canvasStatus.issues.length > 0 && (
                <ul className="list-inside list-disc text-sm text-gray-400">
                  {canvasStatus.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Agent execution testing removed */}

          {/* Execution result UI removed */}
        </div>

        {/* React Flow Canvas */}
        <div className="h-96 w-full rounded-lg border border-gray-600 bg-gray-800">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p>• Drag nodes to reposition them</p>
          <p>• Connect nodes by dragging from one node's handle to another</p>
          <p>• Use mouse wheel to zoom, drag to pan</p>
          <p>
            • <strong>Connect Client Agent to specialized agents</strong> to
            enable execution
          </p>
          <p>• Test your configuration with the execution testing feature</p>
          <p>• Canvas state is saved persistently in the backend canister</p>
          <p>
            • Demo pages will use your canvas configuration for agent routing
          </p>
        </div>
      </div>
    </div>
  );
}
