import { Handle, Position } from "reactflow";

interface GenericAgentNodeData {
  label: string;
}

export function GenericAgentNode({ data }: { data: GenericAgentNodeData }) {
  return (
    <div className="rounded-md border border-gray-500 bg-gray-700 px-3 py-2 text-white">
      <div className="text-sm font-semibold">{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
