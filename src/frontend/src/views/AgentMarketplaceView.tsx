import { useState, useMemo, useEffect } from "react";
import { AgentCard } from "../components/AgentCard";
import {
  Agent,
  marketplaceAgents,
  categoryOptions,
  sortOptions,
  addPurchasedAgent,
  isPurchased as checkIsPurchased,
} from "../services/agentMarketplace";

interface AgentMarketplaceViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export function AgentMarketplaceView({ onError }: AgentMarketplaceViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("rating");
  const [searchQuery, setSearchQuery] = useState("");
  const [purchasedAgents, setPurchasedAgents] = useState<string[]>([]);

  // Refresh purchased agents on mount
  useEffect(() => {
    const purchased = JSON.parse(
      localStorage.getItem("purchasedAgents") || "[]",
    );
    setPurchasedAgents(purchased.map((p: any) => p.agentId));
  }, []);

  const filteredAndSortedAgents = useMemo(() => {
    let filtered = marketplaceAgents;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (agent) => agent.category === selectedCategory,
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Sort agents
    const sorted = [...filtered].sort((a, b) => {
      switch (selectedSort) {
        case "rating":
          return b.rating - a.rating;
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "reviews":
          return b.reviewCount - a.reviewCount;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [selectedCategory, selectedSort, searchQuery]);

  const handlePurchase = (agent: Agent) => {
    try {
      addPurchasedAgent(agent);
      setPurchasedAgents((prev) => [...prev, agent.id]);
      console.log(`Successfully purchased ${agent.name}`);
    } catch (error) {
      onError(`Failed to purchase ${agent.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-700 p-6">
        <h3 className="mb-6 text-2xl font-bold">Agent Marketplace</h3>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Sort By
              </label>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-300">
            Showing {filteredAndSortedAgents.length} of{" "}
            {marketplaceAgents.length} agents
          </p>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isPurchased={
                purchasedAgents.includes(agent.id) || checkIsPurchased(agent.id)
              }
              onPurchase={handlePurchase}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredAndSortedAgents.length === 0 && (
          <div className="py-12 text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <p className="text-gray-400">
              No agents found matching your criteria.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search or filters.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 text-sm text-gray-400">
          <p>• Purchased agents will be available in the Agent Canvas</p>
          <p>• All purchases are stored locally in your browser</p>
          <p>
            • Use filters and search to find the perfect agent for your workflow
          </p>
        </div>
      </div>
    </div>
  );
}
