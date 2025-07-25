import Result "mo:base/Result";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import AgentRegistryInterface "AgentRegistryInterface";

module {
    public type AgentRegistryService = AgentRegistryInterface.AgentRegistryInterface;

    // Service class for managing agent registry operations
    public class AgentDiscoveryService(registryCanisterId : Text) {

        private let agentRegistry : AgentRegistryService = actor (registryCanisterId);

        // Get the current registry canister ID
        public func getRegistryCanisterId() : Text {
            registryCanisterId;
        };

        // Discover and register agents automatically
        public func discoverAndRegisterAgents(canisterIds : [Text]) : async [Result.Result<Text, Text>] {
            try {
                let results = await agentRegistry.discoverAgents(canisterIds);
                var textResults : [Result.Result<Text, Text>] = [];

                for (result in results.vals()) {
                    switch (result) {
                        case (#ok(discovery)) {
                            textResults := Array.append(textResults, [#ok("Registered: " # discovery.name)]);
                        };
                        case (#err(error)) {
                            textResults := Array.append(textResults, [#err(error)]);
                        };
                    };
                };

                textResults;
            } catch (e) {
                [#err("Failed to discover agents: " # Error.message(e))];
            };
        };

        // Get all available agents from registry
        public func getAvailableAgents() : async [{
            canister_id : Text;
            name : Text;
            description : Text;
            agent_type : Text;
        }] {
            try {
                await agentRegistry.getAllRegisteredAgents();
            } catch (e) {
                Debug.print("Failed to get available agents: " # Error.message(e));
                [];
            };
        };

        // Execute a task on a specific agent type
        public func executeAgentTask(agentType : Text, task : Text) : async Result.Result<Text, Text> {
            try {
                await agentRegistry.executeAgentTask(agentType, task);
            } catch (e) {
                #err("Failed to execute agent task: " # Error.message(e));
            };
        };

        // Get registry statistics
        public func getRegistryStats() : async ?{
            total_registered : Nat;
            canister_ids : [Text];
            agent_types : [Text];
        } {
            try {
                ?(await agentRegistry.getRegistryStats());
            } catch (e) {
                Debug.print("Failed to get registry stats: " # Error.message(e));
                null;
            };
        };

        // Register a single agent
        public func registerAgent(canisterId : Text) : async Result.Result<{ canister_id : Text; name : Text; description : Text; agent_type : Text }, Text> {
            try {
                await agentRegistry.registerAgent(canisterId);
            } catch (e) {
                #err("Failed to register agent: " # Error.message(e));
            };
        };

        // Batch register multiple agents
        public func batchRegisterAgents(canisterIds : [Text]) : async ?{
            successful : [{
                canister_id : Text;
                name : Text;
                description : Text;
                agent_type : Text;
            }];
            failed : [Text];
        } {
            try {
                ?(await agentRegistry.batchRegisterAgents(canisterIds));
            } catch (e) {
                Debug.print("Failed to batch register agents: " # Error.message(e));
                null;
            };
        };
    };
};
