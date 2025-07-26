import Text "mo:base/Text";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Char "mo:base/Char";
import AgentInterface "../../shared/AgentInterface";

persistent actor AgentRegistry {

    // Dynamic agent discovery - no hardcoded types!
    public type AgentDiscovery = {
        canister_id : Text;
        name : Text;
        description : Text;
        agent_type : Text; // Derived from name/description
    };

    public type AgentCallResult = Result.Result<Text, Text>;

    // HashMap to store discovered agent canister IDs
    private var agentCanistersEntries : [(Text, Text)] = [];
    private transient var agentCanisters = HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);

    // Cache for agent metadata to avoid repeated calls
    private var agentMetadataEntries : [(Text, AgentInterface.AgentMetadata)] = [];
    private transient var agentMetadataCache = HashMap.HashMap<Text, AgentInterface.AgentMetadata>(10, Text.equal, Text.hash);

    // Initialize from stable storage
    system func preupgrade() {
        agentCanistersEntries := Iter.toArray(agentCanisters.entries());
        agentMetadataEntries := Iter.toArray(agentMetadataCache.entries());
        apiKeysEntries := Iter.toArray(apiKeys.entries());
    };

    system func postupgrade() {
        agentCanisters := HashMap.fromIter(agentCanistersEntries.vals(), agentCanistersEntries.size(), Text.equal, Text.hash);
        agentMetadataCache := HashMap.fromIter(agentMetadataEntries.vals(), agentMetadataEntries.size(), Text.equal, Text.hash);
        apiKeys := HashMap.fromIter(apiKeysEntries.vals(), apiKeysEntries.size(), Text.equal, Text.hash);
        agentCanistersEntries := [];
        agentMetadataEntries := [];
        apiKeysEntries := [];
    };

    // Dynamically register an agent by canister ID
    public func registerAgent(canisterId : Text) : async Result.Result<AgentDiscovery, Text> {
        try {
            // Try to call the agent's get_metadata function
            let agentActor : AgentInterface.AgentInterface = actor (canisterId);
            let metadata = await agentActor.get_metadata();

            // Cache the metadata
            agentMetadataCache.put(canisterId, metadata);

            // Derive agent type from name (e.g., "Weather Agent" -> "weather_agent")
            let agentType = deriveAgentType(metadata.name);

            // Store the mapping
            agentCanisters.put(agentType, canisterId);

            let discovery : AgentDiscovery = {
                canister_id = canisterId;
                name = metadata.name;
                description = metadata.description;
                agent_type = agentType;
            };

            Debug.print("Registered agent: " # metadata.name # " (" # agentType # ") at " # canisterId);
            #ok(discovery);
        } catch (error) {
            let errorMsg = "Failed to register agent " # canisterId # ": " # Error.message(error);
            Debug.print(errorMsg);
            #err(errorMsg);
        };
    };

    // Automatically discover and register agents from a list of canister IDs
    public func discoverAgents(canisterIds : [Text]) : async [Result.Result<AgentDiscovery, Text>] {
        var results : [Result.Result<AgentDiscovery, Text>] = [];

        for (canisterId in canisterIds.vals()) {
            let result = await registerAgent(canisterId);
            results := Array.append(results, [result]);
        };

        results;
    };

    // Get agent canister ID by type
    public query func getAgentCanister(agentType : Text) : async ?Text {
        agentCanisters.get(agentType);
    };

    // Check if agent is configured
    public query func isAgentConfigured(agentType : Text) : async Bool {
        switch (agentCanisters.get(agentType)) {
            case (?canisterId) canisterId != "";
            case null false;
        };
    };

    // Execute task on a specific agent by type
    public func executeAgentTask(agentType : Text, task : Text) : async AgentCallResult {
        switch (agentCanisters.get(agentType)) {
            case (?canisterId) {
                if (canisterId == "") {
                    let errorMsg = "Agent " # agentType # " is not configured (empty canister ID)";
                    Debug.print(errorMsg);
                    return #err(errorMsg);
                };

                try {
                    let agentActor : AgentInterface.AgentInterface = actor (canisterId);
                    let response = await agentActor.execute_task(task);
                    #ok(response);
                } catch (error) {
                    let errorMsg = "Failed to call " # agentType # ": " # Error.message(error);
                    Debug.print(errorMsg);
                    #err(errorMsg);
                };
            };
            case null {
                let errorMsg = "Agent " # agentType # " is not registered";
                Debug.print(errorMsg);
                #err(errorMsg);
            };
        };
    };

    // Get all registered agents with their metadata
    public query func getAllRegisteredAgents() : async [AgentDiscovery] {
        getAllRegisteredAgentsSync();
    };

    // Remove an agent from registry
    public func unregisterAgent(agentType : Text) : async Bool {
        switch (agentCanisters.get(agentType)) {
            case (?canisterId) {
                agentCanisters.delete(agentType);
                agentMetadataCache.delete(canisterId);
                Debug.print("Unregistered agent: " # agentType);
                true;
            };
            case null false;
        };
    };

    // Clear all agent configurations
    public func clearAllAgents() : async () {
        agentCanisters := HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);
        agentMetadataCache := HashMap.HashMap<Text, AgentInterface.AgentMetadata>(10, Text.equal, Text.hash);
        Debug.print("Cleared all agent configurations");
    };

    // Get registry statistics
    public query func getRegistryStats() : async {
        total_registered : Nat;
        agent_types : [Text];
        canister_ids : [Text];
    } {
        let agents = getAllRegisteredAgentsSync();
        let agentTypes = agents |> Array.map(_, func(a : AgentDiscovery) : Text { a.agent_type });
        let canisterIds = agents |> Array.map(_, func(a : AgentDiscovery) : Text { a.canister_id });

        {
            total_registered = agents.size();
            agent_types = agentTypes;
            canister_ids = canisterIds;
        };
    };

    // Helper function for synchronous access to registered agents
    private func getAllRegisteredAgentsSync() : [AgentDiscovery] {
        var agents : [AgentDiscovery] = [];

        for ((agentType, canisterId) in agentCanisters.entries()) {
            switch (agentMetadataCache.get(canisterId)) {
                case (?metadata) {
                    let discovery : AgentDiscovery = {
                        canister_id = canisterId;
                        name = metadata.name;
                        description = metadata.description;
                        agent_type = agentType;
                    };
                    agents := Array.append(agents, [discovery]);
                };
                case null {
                    // Agent registered but metadata not cached - shouldn't happen in normal operation
                    let discovery : AgentDiscovery = {
                        canister_id = canisterId;
                        name = "Unknown";
                        description = "Metadata not available";
                        agent_type = agentType;
                    };
                    agents := Array.append(agents, [discovery]);
                };
            };
        };

        agents;
    };

    // Refresh metadata for all registered agents
    public func refreshAgentMetadata() : async [Result.Result<Text, Text>] {
        var results : [Result.Result<Text, Text>] = [];

        for ((agentType, canisterId) in agentCanisters.entries()) {
            if (canisterId != "") {
                try {
                    let agentActor : AgentInterface.AgentInterface = actor (canisterId);
                    let metadata = await agentActor.get_metadata();
                    agentMetadataCache.put(canisterId, metadata);
                    results := Array.append(results, [#ok("Refreshed " # agentType)]);
                } catch (error) {
                    let errorMsg = "Failed to refresh " # agentType # ": " # Error.message(error);
                    results := Array.append(results, [#err(errorMsg)]);
                };
            };
        };

        results;
    };

    // Helper function to derive agent type from agent name
    private func deriveAgentType(name : Text) : Text {
        // Convert "Weather Agent" -> "weather_agent"
        // Convert "Air Quality Agent" -> "airquality_agent"
        // Convert "Planner Agent" -> "planner_agent"

        let lowercase = Text.map(
            name,
            func(c : Char) : Char {
                if (c >= 'A' and c <= 'Z') {
                    Char.fromNat32(Char.toNat32(c) + 32);
                } else {
                    c;
                };
            },
        );

        // Replace spaces with underscores and remove non-alphanumeric characters
        let normalized = Text.map(
            lowercase,
            func(c : Char) : Char {
                if (c == ' ') {
                    '_';
                } else if ((c >= 'a' and c <= 'z') or (c >= '0' and c <= '9') or c == '_') {
                    c;
                } else {
                    '_';
                };
            },
        );

        // Remove consecutive underscores and trim
        let cleaned = Text.replace(normalized, #text("__"), "_");
        let trimmed = Text.trimEnd(Text.trimStart(cleaned, #char('_')), #char('_'));

        if (trimmed == "") {
            "unknown_agent";
        } else {
            trimmed;
        };
    };

    // Helper function to check if a canister implements the AgentInterface
    public func isAgentCanister(canisterId : Text) : async Bool {
        try {
            let agentActor : AgentInterface.AgentInterface = actor (canisterId);
            ignore await agentActor.get_metadata();
            true;
        } catch (_error) {
            false;
        };
    };

    // Batch register multiple agents
    public func batchRegisterAgents(canisterIds : [Text]) : async {
        successful : [AgentDiscovery];
        failed : [(Text, Text)]; // (canisterId, error)
    } {
        var successful : [AgentDiscovery] = [];
        var failed : [(Text, Text)] = [];

        for (canisterId in canisterIds.vals()) {
            switch (await registerAgent(canisterId)) {
                case (#ok(discovery)) {
                    successful := Array.append(successful, [discovery]);
                };
                case (#err(error)) {
                    failed := Array.append(failed, [(canisterId, error)]);
                };
            };
        };

        { successful = successful; failed = failed };
    };

    // API Key Management
    private var apiKeysEntries : [(Text, Text)] = [];
    private transient var apiKeys = HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);

    // Set API key for a service
    public func setApiKey(service : Text, apiKey : Text) : async Result.Result<Text, Text> {
        apiKeys.put(service, apiKey);
        Debug.print("API key set for service: " # service);
        #ok("API key set successfully for " # service);
    };

    // Get API key for a service (agents can call this)
    public query func getApiKey(service : Text) : async ?Text {
        apiKeys.get(service);
    };

    // Check if API key exists for a service
    public query func hasApiKey(service : Text) : async Bool {
        switch (apiKeys.get(service)) {
            case (?key) key != "";
            case null false;
        };
    };

    // List all services with API keys (keys are hidden)
    public query func listApiServices() : async [Text] {
        Iter.toArray(apiKeys.keys());
    };
};
