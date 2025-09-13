import React, { useState, useMemo, useEffect } from "react";
import { CreateAgentForm } from "../components";
import { pythonCompilationService } from "../services/pythonCompilationService";
import { wasmDeploymentService } from "../services/wasmDeploymentService";
import { useAuth } from "../contexts/AuthContext";
import { fetchRegistryAgents } from "../services/agentRegistryService";

interface AgentMarketplaceViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

export function AgentMarketplaceView({}: AgentMarketplaceViewProps) {
  const { isAuthenticated } = useAuth();
  const [agents, setAgents] = useState<
    { agent_name: string; canister_id: string }[]
  >([]);
  const [loadError, setLoadError] = useState<string>("");
  const [loadingAgents, setLoadingAgents] = useState<boolean>(false);
  const [selectedSort] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [createError, setCreateError] = useState<string>("");
  const [deploymentStatus, setDeploymentStatus] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingAgents(true);
      const res = await fetchRegistryAgents();
      if (res.success) {
        setAgents(res.data ?? []);
        setLoadError("");
      } else {
        setLoadError(res.error || "Failed to load agents");
      }
      setLoadingAgents(false);
    };
    load();
  }, []);

  const handleWasmUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!isAuthenticated) {
        setCreateError("Please sign in first to upload WASM files.");
        return;
      }

      setDeploymentStatus("Uploading WASM...");
      setUploadProgress(0);

      console.log(
        "[DEBUG] Starting WASM upload for file:",
        file.name,
        "size:",
        file.size,
      );
      const result = await wasmDeploymentService.deployRawWasm(
        file,
        (progress) => {
          console.log("[DEBUG] Upload progress:", progress);
          setUploadProgress(progress.percentage);
          setDeploymentStatus(
            `Uploading chunk ${progress.currentChunk}/${progress.totalChunks} (${Math.round(progress.percentage)}%)`,
          );
          if (progress.currentChunk === progress.totalChunks) {
            setDeploymentStatus("All chunks uploaded! Deploying WASM...");
            console.log("[DEBUG] All chunks uploaded, starting deployment");
          }
        },
      );

      console.log("[DEBUG] Deployment result:", result);
      if (result.success) {
        console.log(
          "[DEBUG] Deployment successful with canister ID:",
          result.canisterId,
        );
        setDeploymentStatus(
          `Successfully deployed! Canister ID: ${result.canisterId}`,
        );
      } else {
        console.error("[DEBUG] Deployment failed:", result.error);
        setDeploymentStatus(`Deployment failed: ${result.error}`);
      }
    } catch (error) {
      setDeploymentStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setUploadProgress(null); // Clear progress bar after completion or error
    }
  };

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

      // Skip execute_task testing in frontend
      if (compilationResult.wasmData) {
        console.log(
          "Skipping execute_task test in frontend; metadata compiled.",
        );
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
    let filtered = agents;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((agent) =>
        agent.agent_name.toLowerCase().includes(query),
      );
    }

    // Sort agents
    const sorted = [...filtered].sort((a, b) => {
      switch (selectedSort) {
        case "name":
        default:
          return a.agent_name.localeCompare(b.agent_name);
      }
    });

    return sorted;
  }, [agents, selectedSort, searchQuery]);

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
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  console.log("Create Agent button clicked");
                  setShowCreateForm(true);
                }}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                Create New Agent
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".wasm"
                  onChange={handleWasmUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setCreateError(
                        "Please sign in first to upload WASM files.",
                      );
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isAuthenticated}
                >
                  {isAuthenticated ? "Upload WASM" : "Sign in to Upload WASM"}
                </button>
              </div>
            </div>
          </div>

          {createError && (
            <div className="bg-opacity-20 mb-4 rounded border border-red-600 bg-red-900 p-4">
              <p className="text-red-400">
                <strong>Error:</strong> {createError}
              </p>
            </div>
          )}

          {(deploymentStatus || uploadProgress !== null) && (
            <div
              className={`bg-opacity-20 mb-4 rounded border p-4 ${
                deploymentStatus.includes("Successfully")
                  ? "border-green-600 bg-green-900 text-green-400"
                  : "border-yellow-600 bg-yellow-900 text-yellow-400"
              }`}
            >
              <p>
                <strong>Status:</strong> {deploymentStatus}
              </p>
              {uploadProgress !== null && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="h-2.5 w-full rounded-full bg-gray-700 dark:bg-gray-700">
                    <div
                      className="h-2.5 rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {Math.round(uploadProgress)}% uploaded
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Search */}
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
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-gray-300">
              {loadingAgents
                ? "Loading agents..."
                : `Showing ${filteredAndSortedAgents.length} agents`}
            </p>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedAgents.map((agent) => (
              <div
                key={agent.canister_id}
                className="rounded-lg border border-gray-600 bg-gray-700 p-4 shadow-lg"
              >
                <div className="mb-1 text-sm text-gray-400">
                  {agent.canister_id}
                </div>
                <div className="text-lg font-bold">{agent.agent_name}</div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {!loadingAgents && filteredAndSortedAgents.length === 0 && (
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

          {loadError && (
            <div className="mt-4 rounded border border-red-600 bg-red-900/30 p-3 text-red-300">
              {loadError}
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
