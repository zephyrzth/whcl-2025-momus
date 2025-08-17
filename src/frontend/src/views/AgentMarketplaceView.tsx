import { useState, useMemo } from "react";
import { AgentCard, CreateAgentForm } from "../components";
import {
  marketplaceAgents,
  categoryOptions,
  sortOptions,
} from "../services/agentMarketplace";
import { pythonCompilationService } from "../services/pythonCompilationService";

interface AgentMarketplaceViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export function AgentMarketplaceView({}: AgentMarketplaceViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [createError, setCreateError] = useState<string>("");

  const handleCreateAgent = async (
    metadata: {
      name: string;
      description: string;
      category: string;
      tags: string[];
    },
    _pythonFile: File,
    pythonContent: string,
  ) => {
    console.log("Masuk handle create agent");
    setIsCreatingAgent(true);
    setCreateError("");

    try {
      console.log("Starting agent creation process...");

      // Compile Python to WASM
      const compilationResult =
        await pythonCompilationService.compilePythonToWasm(
          pythonContent,
          metadata.name,
        );

      if (!compilationResult.success) {
        throw new Error(
          compilationResult.error || "Failed to compile Python code",
        );
      }

      console.log("Python code compiled successfully");

      // Test the compiled agent
      if (compilationResult.wasmData) {
        const testResult = await pythonCompilationService.testAgent(
          compilationResult.wasmData,
        );
        if (!testResult.success) {
          throw new Error(`Agent test failed: ${testResult.error}`);
        }
        console.log("Agent test passed:", testResult.result);
      }

      // Here we would normally send the WASM data to the backend
      // For now, we'll just show success
      console.log("Agent created successfully:", {
        metadata,
        wasmSize: compilationResult.wasmData?.length || 0,
        compilationMetadata: compilationResult.metadata,
      });

      alert("Agent created successfully! (Note: Backend integration pending)");
      setShowCreateForm(false);
    } catch (error) {
      console.error("Agent creation failed:", error);
      setCreateError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateError("");
  };

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
        case "name":
          return a.name.localeCompare(b.name);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return sorted;
  }, [selectedCategory, selectedSort, searchQuery]);

  console.log("showCreateForm state:", showCreateForm);

  return (
    <div className="space-y-6">
      {showCreateForm ? (
        <CreateAgentForm
          onSubmit={handleCreateAgent}
          onCancel={handleCancelCreate}
          isLoading={isCreatingAgent}
        />
      ) : (
        <div className="rounded-lg bg-gray-700 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-bold">Agent Marketplace</h3>
            <button
              onClick={() => {
                console.log("Create Agent button clicked");
                setShowCreateForm(true);
              }}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              Create New Agent
            </button>
          </div>

          {createError && (
            <div className="bg-opacity-20 mb-4 rounded border border-red-600 bg-red-900 p-4">
              <p className="text-red-400">
                <strong>Error:</strong> {createError}
              </p>
            </div>
          )}

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
              <AgentCard key={agent.id} agent={agent} />
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
            <p>• All agents are available for use in the Agent Canvas</p>
            <p>
              • Use filters and search to find the perfect agent for your
              workflow
            </p>
            <p>• Create custom Python agents with ML/AI capabilities</p>
          </div>
        </div>
      )}
    </div>
  );
}
