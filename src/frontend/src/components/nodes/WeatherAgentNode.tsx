import { Handle, Position, NodeProps } from "reactflow";

interface WeatherAgentData {
  label: string;
}

export function WeatherAgentNode({ data }: NodeProps<WeatherAgentData>) {
  return (
    <div className="rounded-lg border-2 border-blue-500 bg-blue-100 p-4 shadow-lg">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center space-x-2">
        <div className="text-2xl">🌤️</div>
        <div>
          <div className="font-bold text-blue-800">{data.label}</div>
          <div className="text-sm text-blue-600">Weather Information</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
