import { Handle, Position, NodeProps } from "reactflow";

interface ClientAgentData {
  label: string;
}

export function ClientAgentNode({ data }: NodeProps<ClientAgentData>) {
  return (
    <div className="rounded-lg border-2 border-green-500 bg-green-100 p-4 shadow-lg">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center space-x-2">
        <div className="text-2xl">👤</div>
        <div>
          <div className="font-bold text-green-800">{data.label}</div>
          <div className="text-sm text-green-600">Client Interface</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
