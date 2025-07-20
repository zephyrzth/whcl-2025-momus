import { Agent } from "../services/agentMarketplace";

interface AgentCardProps {
  agent: Agent;
  isPurchased: boolean;
  onPurchase: (agent: Agent) => void;
}

export function AgentCard({ agent, isPurchased, onPurchase }: AgentCardProps) {
  const handlePurchase = () => {
    if (!isPurchased) {
      onPurchase(agent);
    }
  };

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-700 p-4 shadow-lg transition-transform hover:scale-105">
      {/* Preview Image */}
      <div className="mb-3 text-center">
        <div className="text-4xl">{agent.previewImage}</div>
      </div>

      {/* Agent Info */}
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">{agent.name}</h3>
        <p className="line-clamp-2 text-sm text-gray-300">
          {agent.description}
        </p>
      </div>

      {/* Rating */}
      <div className="mb-3 flex items-center space-x-2">
        <div className="flex text-yellow-400">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i}>
              {i < Math.floor(agent.rating)
                ? "★"
                : i < agent.rating
                  ? "☆"
                  : "☆"}
            </span>
          ))}
        </div>
        <span className="text-sm text-gray-400">
          {agent.rating} ({agent.reviewCount} reviews)
        </span>
      </div>

      {/* Tags */}
      <div className="mb-3 flex flex-wrap gap-1">
        {agent.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-blue-600 px-2 py-1 text-xs text-white"
          >
            {tag}
          </span>
        ))}
        {agent.tags.length > 3 && (
          <span className="rounded-full bg-gray-600 px-2 py-1 text-xs text-gray-300">
            +{agent.tags.length - 3}
          </span>
        )}
      </div>

      {/* Price and Purchase */}
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold text-green-400">${agent.price}</span>
        <button
          onClick={handlePurchase}
          disabled={isPurchased}
          className={`rounded px-4 py-2 font-medium transition-colors ${
            isPurchased
              ? "cursor-not-allowed bg-gray-600 text-gray-400"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          }`}
        >
          {isPurchased ? "Purchased" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}
