import LLM "mo:llm";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Float "mo:base/Float";
import _Debug "mo:base/Debug";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import _Option "mo:base/Option";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";

persistent actor Main {
    // Counter variable to keep track of count
    private var counter : Nat64 = 0;

    // Canvas state storage per user
    private var canvasStatesEntries: [(Principal, CanvasState)] = [];
    private transient var canvasStates = HashMap.fromIter<Principal, CanvasState>(canvasStatesEntries.vals(), canvasStatesEntries.size(), Principal.equal, Principal.hash);

    // Canvas data types for agent workflow
    public type AgentPosition = {
        x: Float;
        y: Float;
    };

    public type AgentNode = {
        id: Text;
        nodeType: Text;
        position: AgentPosition;
        agentLabel: Text;
        attributes: [(Text, Text)];
    };

    public type AgentConnection = {
        id: Text;
        source: Text;
        target: Text;
        connectionType: Text;
    };

    public type CanvasState = {
        nodes: [AgentNode];
        connections: [AgentConnection];
        lastUpdated: Text;
        version: Nat;
    };

    // Authentication data types
    public type User = {
        principalId: Principal;
        displayName: ?Text;
        createdAt: Int;
    };

    public type UserProfileResult = Result.Result<User, Text>;

    public type UpdateUserResult = Result.Result<User, Text>;

    // User storage
    private var usersEntries: [(Principal, User)] = [];
    
    private transient var users = HashMap.fromIter<Principal, User>(usersEntries.vals(), usersEntries.size(), Principal.equal, Principal.hash);

    // Greeting function that the frontend uses
    public query func greet(name : Text) : async Text {
        return "Hello, " # name # "!";
    };

    // Get the current counter value
    public query func get_count() : async Nat64 {
        return counter;
    };

    // Increment the counter and return the new value
    public func increment() : async Nat64 {
        counter += 1;
        return counter;
    };

    // Set the counter to a specific value
    public func set_count(value : Nat64) : async Nat64 {
        counter := value;
        return counter;
    };

    // LLM functions
    public func prompt(prompt : Text) : async Text {
        await LLM.prompt(#Llama3_1_8B, prompt);
    };

    public func chat(messages : [LLM.ChatMessage]) : async Text {
        let response = await LLM.chat(#Llama3_1_8B).withMessages(messages).send();

        switch (response.message.content) {
            case (?text) text;
            case null "";
        };
    };

    // Canvas state management functions
    
    // Save canvas state for current user
    public shared(msg) func save_canvas_state(state: CanvasState) : async Bool {
        let caller = msg.caller;
        Debug.print("[DEBUG] Saving canvas state for user:"# Principal.toText(caller) # ".");
        canvasStates.put(caller, state);
        true;
    };

    // Load canvas state for current user
    public shared query(msg) func get_canvas_state() : async ?CanvasState {
        let caller = msg.caller;

        Debug.print("[DEBUG] Getting canvas state for user:" # Principal.toText(caller) # ".");
        canvasStates.get(caller);
    };

    // Clear canvas state for current user
    public shared(msg) func clear_canvas_state() : async Bool {
        let caller = msg.caller;
        canvasStates.delete(caller);
        true;
    };

    // Check if current user has saved canvas state
    public shared query(msg) func has_canvas_state() : async Bool {
        let caller = msg.caller;
        switch (canvasStates.get(caller)) {
            case (?_) { true };
            case null { false };
        };
    };

    // System upgrade hooks for stable storage
    system func preupgrade() {
        usersEntries := Iter.toArray(users.entries());
        canvasStatesEntries := Iter.toArray(canvasStates.entries());
    };

    system func postupgrade() {
        users := HashMap.fromIter<Principal, User>(usersEntries.vals(), usersEntries.size(), Principal.equal, Principal.hash);
        usersEntries := [];
        canvasStates := HashMap.fromIter<Principal, CanvasState>(canvasStatesEntries.vals(), canvasStatesEntries.size(), Principal.equal, Principal.hash);
        canvasStatesEntries := [];
    };

    // Principal-based authentication functions
    public shared(msg) func createUserProfile(displayName: ?Text) : async UserProfileResult {
        let caller = msg.caller;
        
        // Check if user already exists
        switch (users.get(caller)) {
            case (?_existingUser) {
                #err("User profile already exists");
            };
            case null {
                let user: User = {
                    principalId = caller;
                    displayName = displayName;
                    createdAt = Time.now();
                };
                
                users.put(caller, user);
                #ok(user);
            };
        };
    };

    public shared(msg) func getUserProfile() : async UserProfileResult {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?user) {
                #ok(user);
            };
            case null {
                #err("User profile not found");
            };
        };
    };

    public shared(msg) func updateUserProfile(displayName: ?Text) : async UpdateUserResult {
        let caller = msg.caller;
        
        switch (users.get(caller)) {
            case (?existingUser) {
                let updatedUser: User = {
                    principalId = caller;
                    displayName = displayName;
                    createdAt = existingUser.createdAt;
                };
                
                users.put(caller, updatedUser);
                #ok(updatedUser);
            };
            case null {
                #err("User profile not found");
            };
        };
    };

    public shared(msg) func whoami() : async Principal {
        msg.caller;
    };

    public query func getUserCount() : async Nat {
        users.size();
    };
};
