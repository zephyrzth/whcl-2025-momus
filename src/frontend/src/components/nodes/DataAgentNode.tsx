import { Handle, Position, NodeProps } from "reactflow";

interface DataAgentData {
  label: string;
}

export function DataAgentNode({ data }: NodeProps<DataAgentData>) {
  return (
    <div className="rounded-lg border-2 border-purple-500 bg-purple-100 p-4 shadow-lg">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center space-x-2">
        <div className="text-2xl">📊</div>
        <div>
          <div className="font-bold text-purple-800">{data.label}</div>
          <div className="text-sm text-purple-600">Data Analytics</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
