import { Agent } from "../services/agentMarketplace";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="rounded-lg border border-gray-600 bg-gray-700 p-4 shadow-lg transition-transform hover:scale-105">
      {/* Preview Image */}
      <div className="mb-3 text-center">
        <div className="text-4xl">{agent.previewImage}</div>
      </div>

      {/* Agent Info */}
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">{agent.name}</h3>
        <p className="text-sm text-gray-300">{agent.description}</p>
      </div>
    </div>
  );
}
