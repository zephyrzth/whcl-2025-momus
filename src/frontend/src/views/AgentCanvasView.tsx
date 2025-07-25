import { useCallback, useState, useEffect } from "react";
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

// Import React Flow styles
import "reactflow/dist/style.css";

// Custom node types
import { WeatherAgentNode } from "../components/nodes/WeatherAgentNode";
import { ClientAgentNode } from "../components/nodes/ClientAgentNode";
import { DataAgentNode } from "../components/nodes/DataAgentNode";
import { getPurchasedAgents } from "../services/agentMarketplace";
import { CanvasService } from "../services/canvasService";
import { convertToCanvasState, convertFromCanvasState } from "../types/canvas";
import { Loader } from "../components/Loader";
import { ErrorDisplay } from "../components/ErrorDisplay";

interface AgentCanvasViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

// Define node types for React Flow
const nodeTypes = {
  weatherAgent: WeatherAgentNode,
  clientAgent: ClientAgentNode,
  dataAgent: DataAgentNode,
};

// Initial nodes
const initialNodes: Node[] = [
  {
    id: "1",
    type: "weatherAgent",
    position: { x: 250, y: 100 },
    data: { label: "Weather Agent" },
  },
  {
    id: "2",
    type: "clientAgent",
    position: { x: 100, y: 200 },
    data: { label: "Client Agent" },
  },
];

const initialEdges: Edge[] = [];

export function AgentCanvasView({ onError }: AgentCanvasViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchasedAgents = getPurchasedAgents();

  // Load canvas state on component mount
  useEffect(() => {
    loadCanvasFromBackend();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadCanvasFromBackend = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await CanvasService.loadCanvasState();
      if (result.success && result.data) {
        const { nodes: loadedNodes, edges: loadedEdges } =
          convertFromCanvasState(result.data);
        setNodes(loadedNodes);
        setEdges(loadedEdges);
      } else if (!result.success) {
        setError(result.error || "Failed to load canvas state");
      }
      // If no data, keep default initial state
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
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
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
          {/* Default Agents */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-300">
              Default Agents
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onAddWeatherAgent}
                disabled={isLoading}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Weather Agent
              </button>
              <button
                onClick={onAddClientAgent}
                disabled={isLoading}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Client Agent
              </button>
            </div>
          </div>

          {/* Purchased Agents */}
          {purchasedAgents.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-300">
                Your Purchased Agents
              </h4>
              <div className="flex flex-wrap gap-2">
                {purchasedAgents.map((purchase) => (
                  <button
                    key={purchase.agentId}
                    onClick={() =>
                      onAddPurchasedAgent(
                        purchase.agent.nodeType,
                        purchase.agent.name,
                      )
                    }
                    disabled={isLoading}
                    className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add {purchase.agent.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            • Purchase agents from the marketplace to unlock more node types
          </p>
          <p>• Canvas state is saved persistently in the backend canister</p>
        </div>
      </div>
    </div>
  );
}
