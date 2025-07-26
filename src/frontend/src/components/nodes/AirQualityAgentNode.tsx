import { Handle, Position, NodeProps } from "reactflow";

interface AirQualityAgentData {
  label: string;
}

export function AirQualityAgentNode({ data }: NodeProps<AirQualityAgentData>) {
  return (
    <div className="rounded-lg border-2 border-orange-500 bg-orange-100 p-4 shadow-lg">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center space-x-2">
        <div className="text-2xl">🌬️</div>
        <div>
          <div className="font-bold text-orange-800">{data.label}</div>
          <div className="text-sm text-orange-600">Air Quality Monitor</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
