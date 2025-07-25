import Result "mo:base/Result";

module {
    // Agent Registry interface type for dynamic agent discovery and management
    public type AgentRegistryInterface = actor {
        // Register a single agent by canister ID
        registerAgent : (canisterId : Text) -> async Result.Result<{ canister_id : Text; name : Text; description : Text; agent_type : Text }, Text>;

        // Get the canister ID for a specific agent type
        getAgentCanister : query (agentType : Text) -> async ?Text;

        // Execute a task on a specific agent type through the registry
        executeAgentTask : (agentType : Text, task : Text) -> async Result.Result<Text, Text>;

        // Get all registered agents
        getAllRegisteredAgents : query () -> async [{
            canister_id : Text;
            name : Text;
            description : Text;
            agent_type : Text;
        }];

        // Discover and register multiple agents by calling their get_metadata functions
        discoverAgents : (canisterIds : [Text]) -> async [
            Result.Result<{ canister_id : Text; name : Text; description : Text; agent_type : Text }, Text>
        ];

        // Batch register multiple agents
        batchRegisterAgents : (canisterIds : [Text]) -> async {
            successful : [{
                canister_id : Text;
                name : Text;
                description : Text;
                agent_type : Text;
            }];
            failed : [Text];
        };

        // Get registry statistics
        getRegistryStats : query () -> async {
            total_registered : Nat;
            canister_ids : [Text];
            agent_types : [Text];
        };

        // Refresh cached metadata for all registered agents
        refreshAgentMetadata : () -> async [Result.Result<Text, Text>];

        // API Key Management
        setApiKey : (service : Text, apiKey : Text) -> async Result.Result<Text, Text>;
        getApiKey : query (service : Text) -> async ?Text;
        hasApiKey : query (service : Text) -> async Bool;
        listApiServices : query () -> async [Text];
    };
};
