import AgentRegistryInterface "../shared/AgentRegistryInterface";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Error "mo:base/Error";

module {
    public class ApiKeyService(registryCanisterId : Text) {

        private let registry : AgentRegistryInterface.AgentRegistryInterface = actor (registryCanisterId);

        // Get API key for a service from the registry
        public func getApiKey(service : Text) : async ?Text {
            try {
                await registry.getApiKey(service);
            } catch (error) {
                Debug.print("Failed to get API key for " # service # ": " # Error.message(error));
                null;
            };
        };

        // Check if API key exists for a service
        public func hasApiKey(service : Text) : async Bool {
            try {
                await registry.hasApiKey(service);
            } catch (error) {
                Debug.print("Failed to check API key for " # service # ": " # Error.message(error));
                false;
            };
        };

        // Get API key with fallback message
        public func getApiKeyOrFail(service : Text) : async Result.Result<Text, Text> {
            try {
                switch (await registry.getApiKey(service)) {
                    case (?key) #ok(key);
                    case null #err("API key not found for service: " # service);
                };
            } catch (error) {
                #err("Failed to retrieve API key for " # service # ": " # Error.message(error));
            };
        };

        // List all available API services
        public func listApiServices() : async [Text] {
            try {
                await registry.listApiServices();
            } catch (error) {
                Debug.print("Failed to list API services: " # Error.message(error));
                [];
            };
        };
    };
};
