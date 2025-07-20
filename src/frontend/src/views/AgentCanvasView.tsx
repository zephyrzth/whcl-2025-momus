import { useCallback } from "react";
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

  const purchasedAgents = getPurchasedAgents();

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

  const onSaveCanvas = useCallback(() => {
    try {
      const canvasState = {
        nodes,
        edges,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("agentCanvasState", JSON.stringify(canvasState));
      console.log("Canvas state saved to localStorage");
    } catch (error) {
      onError("Failed to save canvas state");
    }
  }, [nodes, edges, onError]);

  const onLoadCanvas = useCallback(() => {
    try {
      const savedState = localStorage.getItem("agentCanvasState");
      if (savedState) {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedState);
        setNodes(savedNodes);
        setEdges(savedEdges);
        console.log("Canvas state loaded from localStorage");
      }
    } catch (error) {
      onError("Failed to load canvas state");
    }
  }, [setNodes, setEdges, onError]);

  const onClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-700 p-6">
        <h3 className="mb-4 text-xl font-bold">Agentic AI Canvas</h3>

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
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                Add Weather Agent
              </button>
              <button
                onClick={onAddClientAgent}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
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
                    className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
              >
                Save Canvas
              </button>
              <button
                onClick={onLoadCanvas}
                className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                Load Canvas
              </button>
              <button
                onClick={onClearCanvas}
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
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
          <p>• Canvas state is saved locally in your browser</p>
        </div>
      </div>
    </div>
  );
}
