// Canvas state types that match the Motoko backend types
import type { Node, Edge } from "reactflow";

export interface AgentPosition {
  x: number;
  y: number;
}

export interface AgentNode {
  id: string;
  nodeType: string;
  position: AgentPosition;
  agentLabel: string;
  attributes: [string, string][];
}

export interface AgentConnection {
  id: string;
  source: string;
  target: string;
  connectionType: string;
}

export interface CanvasState {
  nodes: AgentNode[];
  connections: AgentConnection[];
  lastUpdated: string;
  version: bigint;
}

// React Flow types for frontend usage
export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

// Conversion utilities
export function convertToCanvasState(
  nodes: Node[],
  edges: Edge[],
): CanvasState {
  const agentNodes: AgentNode[] = nodes.map((node) => ({
    id: node.id,
    nodeType: node.type || "default",
    position: { x: node.position.x, y: node.position.y },
    agentLabel: node.data?.label || "Unnamed Agent",
    attributes: [] as [string, string][], // Default empty attributes
  }));

  const agentConnections: AgentConnection[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    connectionType: edge.type || "default",
  }));

  return {
    nodes: agentNodes,
    connections: agentConnections,
    lastUpdated: new Date().toISOString(),
    version: BigInt(1),
  };
}

export function convertFromCanvasState(canvasState: CanvasState): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  const nodes: ReactFlowNode[] = canvasState.nodes.map((node) => ({
    id: node.id,
    type: node.nodeType,
    position: { x: node.position.x, y: node.position.y },
    data: { label: node.agentLabel },
  }));

  const edges: ReactFlowEdge[] = canvasState.connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    type:
      connection.connectionType === "default"
        ? undefined
        : connection.connectionType,
  }));

  return { nodes, edges };
}
