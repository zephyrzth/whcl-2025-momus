import LLM "mo:llm";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Float "mo:base/Float";
import _Debug "mo:base/Debug";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Array "mo:base/Array";
import _Option "mo:base/Option";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Nat32 "mo:base/Nat32";
import Char "mo:base/Char";

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

    // Authentication data types
    public type User = {
        id: Text;
        email: Text;
        passwordHash: Text;
        createdAt: Int;
    };

    public type Session = {
        userId: Text;
        token: Text;
        expiresAt: Int;
    };

    public type AuthResult = Result.Result<{
        user: User;
        token: Text;
    }, Text>;

    public type LoginResult = Result.Result<{
        user: { id: Text; email: Text };
        token: Text;
    }, Text>;

    // User and session storage
    private var usersEntries: [(Text, User)] = [];
    private var sessionsEntries: [(Text, Session)] = [];
    private var userCounter: Nat = 0;
    
    private transient var users = HashMap.fromIter<Text, User>(usersEntries.vals(), usersEntries.size(), Text.equal, Text.hash);
    private transient var sessions = HashMap.fromIter<Text, Session>(sessionsEntries.vals(), sessionsEntries.size(), Text.equal, Text.hash);

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

    // System upgrade hooks for stable storage
    system func preupgrade() {
        usersEntries := Iter.toArray(users.entries());
        sessionsEntries := Iter.toArray(sessions.entries());
    };

    system func postupgrade() {
        users := HashMap.fromIter<Text, User>(usersEntries.vals(), usersEntries.size(), Text.equal, Text.hash);
        sessions := HashMap.fromIter<Text, Session>(sessionsEntries.vals(), sessionsEntries.size(), Text.equal, Text.hash);
        usersEntries := [];
        sessionsEntries := [];
    };

    // Helper functions
    private func generateUserId() : Text {
        userCounter += 1;
        "user_" # Nat.toText(userCounter);
    };

    private func generateToken(userId: Text) : Text {
        let timestamp = Time.now();
        userId # "_" # Int.toText(timestamp);
    };

    private func hashPassword(password: Text) : Text {
        // Simple hash for demo - in production use proper cryptographic hashing
        let chars = Text.toArray(password);
        var hash = 0;
        for (char in chars.vals()) {
            hash := (hash * 31 + Nat32.toNat(Char.toNat32(char))) % 1000000;
        };
        Int.toText(hash);
    };

    private func isSessionValid(session: Session) : Bool {
        let now = Time.now();
        session.expiresAt > now;
    };

    private func cleanExpiredSessions() : () {
        let now = Time.now();
        let validSessions = HashMap.HashMap<Text, Session>(0, Text.equal, Text.hash);
        
        for ((token, session) in sessions.entries()) {
            if (session.expiresAt > now) {
                validSessions.put(token, session);
            };
        };
        
        sessions := validSessions;
    };

    // Authentication functions
    public func register(email: Text, password: Text) : async AuthResult {
        // Check if user already exists
        let usersArray = Iter.toArray(users.vals());
        let existingUser = Array.filter<User>(usersArray, func(user: User) : Bool {
            user.email == email;
        });
        
        if (existingUser.size() > 0) {
            return #err("User with this email already exists");
        };

        let userId = generateUserId();
        let user: User = {
            id = userId;
            email = email;
            passwordHash = hashPassword(password);
            createdAt = Time.now();
        };

        users.put(email, user);

        let token = generateToken(userId);
        let session: Session = {
            userId = userId;
            token = token;
            expiresAt = Time.now() + (15 * 60 * 1000000000); // 15 minutes in nanoseconds
        };

        sessions.put(token, session);

        #ok({
            user = user;
            token = token;
        });
    };

    public func login(email: Text, password: Text) : async LoginResult {
        cleanExpiredSessions();
        
        switch (users.get(email)) {
            case (?user) {
                if (user.passwordHash == hashPassword(password)) {
                    let token = generateToken(user.id);
                    let session: Session = {
                        userId = user.id;
                        token = token;
                        expiresAt = Time.now() + (15 * 60 * 1000000000); // 15 minutes
                    };

                    sessions.put(token, session);

                    #ok({
                        user = { id = user.id; email = user.email };
                        token = token;
                    });
                } else {
                    #err("Invalid password");
                };
            };
            case null {
                #err("User not found");
            };
        };
    };

    public func logout(token: Text) : async Bool {
        switch (sessions.get(token)) {
            case (?_) {
                sessions.delete(token);
                true;
            };
            case null false;
        };
    };

    public func validateSession(token: Text) : async Result.Result<{ id: Text; email: Text }, Text> {
        cleanExpiredSessions();
        
        switch (sessions.get(token)) {
            case (?session) {
                if (isSessionValid(session)) {
                    let usersArray = Iter.toArray(users.vals());
                    switch (Array.find<User>(usersArray, func(user: User) : Bool {
                        user.id == session.userId;
                    })) {
                        case (?user) {
                            #ok({ id = user.id; email = user.email });
                        };
                        case null {
                            sessions.delete(token);
                            #err("User not found");
                        };
                    };
                } else {
                    sessions.delete(token);
                    #err("Session expired");
                };
            };
            case null {
                #err("Invalid session");
            };
        };
    };

    public func refreshSession(token: Text) : async Result.Result<Text, Text> {
        switch (sessions.get(token)) {
            case (?session) {
                if (isSessionValid(session)) {
                    let newToken = generateToken(session.userId);
                    let newSession: Session = {
                        userId = session.userId;
                        token = newToken;
                        expiresAt = Time.now() + (15 * 60 * 1000000000);
                    };
                    
                    sessions.delete(token);
                    sessions.put(newToken, newSession);
                    
                    #ok(newToken);
                } else {
                    sessions.delete(token);
                    #err("Session expired");
                };
            };
            case null {
                #err("Invalid session");
            };
        };
    };
};
