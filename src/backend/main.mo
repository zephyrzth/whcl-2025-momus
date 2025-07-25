import LLM "mo:llm";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Float "mo:base/Float";
import _Debug "mo:base/Debug";

persistent actor Main {
    // Counter variable to keep track of count
    private var counter : Nat64 = 0;

    // Canvas state storage
    private var canvasState : ?CanvasState = null;

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
    
    // Save canvas state
    public func save_canvas_state(state: CanvasState) : async Bool {
        canvasState := ?state;
        true;
    };

    // Load canvas state
    public query func get_canvas_state() : async ?CanvasState {
        canvasState;
    };

    // Clear canvas state
    public func clear_canvas_state() : async Bool {
        canvasState := null;
        true;
    };

    // Check if canvas has saved state
    public query func has_canvas_state() : async Bool {
        switch (canvasState) {
            case (?_) { true };
            case null { false };
        };
    };
};
