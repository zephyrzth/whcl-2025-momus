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
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Json "mo:json";
import Error "mo:base/Error";
import Char "mo:base/Char";
import Cycles "mo:base/ExperimentalCycles";

persistent actor Main {
  // Counter variable to keep track of count
  private var counter : Nat64 = 0;

  let APP_WALLET : Principal = Principal.fromText("7qho5-xxgtn-z3lqg-ytfyb-avpre-4no2h-2ffxu-ihucl-3ude6-zaubo-mqe");

  type RegistryReturnType = { #Ok : ?Text; #Err : ?Text };
  // Common ReturnType used by agent canisters (client/weather/airquality)
  public type ReturnType = { #Ok : ?Text; #Err : ?Text };
  type AgentRegistry = actor {
    // Registry API
    get_list_agents : query () -> async RegistryReturnType;
    register_agent : (Text, Text) -> async RegistryReturnType;
  };

  let registry : AgentRegistry = actor ("bd3sg-teaaa-aaaaa-qaaba-cai");

  // Canvas state storage per user
  private var canvasStatesEntries : [(Principal, CanvasState)] = [];
  private transient var canvasStates = HashMap.fromIter<Principal, CanvasState>(canvasStatesEntries.vals(), canvasStatesEntries.size(), Principal.equal, Principal.hash);

  // Canvas data types for agent workflow
  public type AgentPosition = {
    x : Float;
    y : Float;
  };

  public type AgentNode = {
    id : Text;
    nodeType : Text;
    position : AgentPosition;
    agentLabel : Text;
    attributes : [(Text, Text)];
  };

  public type AgentConnection = {
    id : Text;
    source : Text;
    target : Text;
    connectionType : Text;
  };

  public type CanvasState = {
    nodes : [AgentNode];
    connections : [AgentConnection];
    lastUpdated : Text;
    version : Nat;
  };

  // Authentication data types
  public type User = {
    principalId : Principal;
    displayName : ?Text;
    createdAt : Int;
  };

  public type UserProfileResult = Result.Result<User, Text>;

  public type UpdateUserResult = Result.Result<User, Text>;

  // User storage
  private var usersEntries : [(Principal, User)] = [];

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
  public shared (msg) func save_canvas_state(state : CanvasState) : async Bool {
    let caller = msg.caller;
    Debug.print("[DEBUG] Saving canvas state for user:" # Principal.toText(caller) # ".");
    canvasStates.put(caller, state);
    true;
  };

  // Load canvas state for current user
  public shared query (msg) func get_canvas_state() : async ?CanvasState {
    let caller = msg.caller;

    Debug.print("[DEBUG] Getting canvas state for user:" # Principal.toText(caller) # ".");
    canvasStates.get(caller);
  };

  // Clear canvas state for current user
  public shared (msg) func clear_canvas_state() : async Bool {
    let caller = msg.caller;
    canvasStates.delete(caller);
    true;
  };

  // Check if current user has saved canvas state
  public shared query (msg) func has_canvas_state() : async Bool {
    let caller = msg.caller;
    switch (canvasStates.get(caller)) {
      case (?_) { true };
      case null { false };
    };
  };

  // ===========================
  // WASM Upload and Deployment
  // ===========================

  // Types
  public type UploadSession = {
    session_id : Text;
    uploader : Principal;
    total_size : Nat; // raw WASM size in bytes
    chunk_count : Nat;
    uploaded_chunks : Nat;
    created_at : Int;
    completed : Bool;
  };

  public type ChunkUploadSuccess = {
    chunk_index : Nat;
    uploaded_chunks : Nat;
    total_chunks : Nat;
  };

  public type ChunkUploadResult = Result.Result<ChunkUploadSuccess, Text>;

  public type DeploymentRecord = {
    canister_id : Text;
    wasm_hash : Text; // tracking id (non-crypto)
    deployed_at : Int;
    original_size : Nat;
    compressed_size : Nat; // same as original for raw uploads
  };

  public type DeployResult = Result.Result<DeploymentRecord, Text>;

  // Storage (stable across upgrades)
  private var uploadSessionsEntries : [(Text, UploadSession)] = [];
  private var chunkStorageEntries : [(Text, Blob)] = [];
  private var deploymentsEntries : [(Text, DeploymentRecord)] = [];

  private transient var uploadSessions = HashMap.fromIter<Text, UploadSession>(uploadSessionsEntries.vals(), uploadSessionsEntries.size(), Text.equal, Text.hash);
  private transient var chunkStorage = HashMap.fromIter<Text, Blob>(chunkStorageEntries.vals(), chunkStorageEntries.size(), Text.equal, Text.hash);
  private transient var deploymentsMap = HashMap.fromIter<Text, DeploymentRecord>(deploymentsEntries.vals(), deploymentsEntries.size(), Text.equal, Text.hash);

  // IC management canister interface (single-shot install only)
  type InstallMode = { #install; #reinstall; #upgrade };
  type CanisterSettings = {
    controllers : ?[Principal];
    compute_allocation : ?Nat;
    memory_allocation : ?Nat;
    freezing_threshold : ?Nat;
  };
  type CreateCanisterArgs = { settings : ?CanisterSettings };
  type CreateCanisterResult = { canister_id : Principal };
  type InstallCodeArgs = {
    mode : InstallMode;
    canister_id : Principal;
    wasm_module : Blob;
    arg : Blob;
  };
  type IC = actor {
    create_canister : shared CreateCanisterArgs -> async CreateCanisterResult;
    install_code : shared InstallCodeArgs -> async ();
  };

  let ic : IC = actor ("aaaaa-aa");

  // Helpers
  func keyFor(sessionId : Text, idx : Nat) : Text {
    sessionId # "_" # Nat.toText(idx);
  };
  func blobSize(b : Blob) : Nat { Blob.toArray(b).size() };
  func shortIdNow(b : Blob) : Text {
    Nat.toText(blobSize(b)) # "-" # Int.toText(Time.now());
  };
  let emptyBlob : Blob = Blob.fromArray([]);

  // System upgrade hooks for stable storage
  system func preupgrade() {
    usersEntries := Iter.toArray(users.entries());
    canvasStatesEntries := Iter.toArray(canvasStates.entries());
    uploadSessionsEntries := Iter.toArray(uploadSessions.entries());
    chunkStorageEntries := Iter.toArray(chunkStorage.entries());
    deploymentsEntries := Iter.toArray(deploymentsMap.entries());
  };

  system func postupgrade() {
    users := HashMap.fromIter<Principal, User>(usersEntries.vals(), usersEntries.size(), Principal.equal, Principal.hash);
    usersEntries := [];
    canvasStates := HashMap.fromIter<Principal, CanvasState>(canvasStatesEntries.vals(), canvasStatesEntries.size(), Principal.equal, Principal.hash);
    canvasStatesEntries := [];
    uploadSessions := HashMap.fromIter<Text, UploadSession>(uploadSessionsEntries.vals(), uploadSessionsEntries.size(), Text.equal, Text.hash);
    uploadSessionsEntries := [];
    chunkStorage := HashMap.fromIter<Text, Blob>(chunkStorageEntries.vals(), chunkStorageEntries.size(), Text.equal, Text.hash);
    chunkStorageEntries := [];
    deploymentsMap := HashMap.fromIter<Text, DeploymentRecord>(deploymentsEntries.vals(), deploymentsEntries.size(), Text.equal, Text.hash);
    deploymentsEntries := [];
  };

  // Principal-based authentication functions
  public shared (msg) func createUserProfile(displayName : ?Text) : async UserProfileResult {
    let caller = msg.caller;

    // Check if user already exists
    switch (users.get(caller)) {
      case (?_existingUser) {
        #err("User profile already exists");
      };
      case null {
        let user : User = {
          principalId = caller;
          displayName = displayName;
          createdAt = Time.now();
        };

        users.put(caller, user);
        #ok(user);
      };
    };
  };

  public shared (msg) func getUserProfile() : async UserProfileResult {
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

  public shared (msg) func updateUserProfile(displayName : ?Text) : async UpdateUserResult {
    let caller = msg.caller;

    switch (users.get(caller)) {
      case (?existingUser) {
        let updatedUser : User = {
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

  public shared (msg) func whoami() : async Principal {
    msg.caller;
  };

  public query func getUserCount() : async Nat {
    users.size();
  };

  // API
  // Proxy to Agent Registry: return all registered agents as-is
  public shared func get_list_agents() : async RegistryReturnType {
    await registry.get_list_agents();
  };

  // Execute a prompt by delegating to the Agentic Client Agent canister.
  // Builds a JSON payload containing the prompt, connected agent names (from the caller's canvas state),
  // and the caller principal. Returns the raw ReturnType from the client agent.
  public shared (msg) func execute_prompt(promptText : Text) : async ReturnType {
    let caller = msg.caller;

    // Gather connected agents from the caller's saved canvas state
    let connectedAgents : [Text] = switch (canvasStates.get(caller)) {
      case (?state) {
        // Derive agent names from nodeType, convert camelCase to kebab-case, exclude client-agent, and dedupe
        let names = Array.tabulate<Text>(
          state.nodes.size(),
          func(i : Nat) : Text {
            camelToKebab(state.nodes[i].nodeType);
          },
        );
        let filtered = Array.filter<Text>(names, func(n : Text) : Bool { n != "client-agent" });
        dedupePreserveOrder(filtered);
      };
      case null { [] };
    };

    let promptEsc = jsonEscape(promptText);
    // Build JSON array string for connected agents
    var agentsJson : Text = "[";
    var first = true;
    for (a in connectedAgents.vals()) {
      if (first) { first := false } else { agentsJson #= "," };
      agentsJson #= "\"" # jsonEscape(a) # "\"";
    };
    agentsJson #= "]";
    let callerTxt = Principal.toText(caller);

    // Build request JSON matching expected schema
    let requestJson = "[" #
    "{\"name\":\"prompt\",\"value\":\"" # promptEsc # "\"}," #
    "{\"name\":\"connected_agent_list\",\"value\":" # agentsJson # "}," #
    "{\"name\":\"user\",\"value\":\"" # jsonEscape(callerTxt) # "\"}" #
    "]";

    // Client Agent interface and call
    type ClientAgent = actor {
      execute_task : (Text) -> async ReturnType;
    };
    let client : ClientAgent = actor ("bw4dl-smaaa-aaaaa-qaacq-cai");
    await client.execute_task(requestJson);
  };

  public shared (msg) func start_chunk_upload(total_size : Nat, chunk_count : Nat) : async Text {
    let sessionId = Principal.toText(msg.caller) # "_" # Int.toText(Time.now());
    let session : UploadSession = {
      session_id = sessionId;
      uploader = msg.caller;
      total_size = total_size;
      chunk_count = chunk_count;
      uploaded_chunks = 0;
      created_at = Time.now();
      completed = false;
    };
    uploadSessions.put(sessionId, session);
    Debug.print("[upload] Started session " # sessionId);
    sessionId;
  };

  public shared (_) func upload_chunk(session_id : Text, chunk_index : Nat, chunk_data : Blob) : async ChunkUploadResult {
    switch (uploadSessions.get(session_id)) {
      case null { return #err("Invalid session ID") };
      case (?session) {
        if (session.completed) return #err("Upload session already completed");
        if (chunk_index >= session.chunk_count) return #err("Invalid chunk index: " # Nat.toText(chunk_index));
        if (Blob.toArray(chunk_data).size() > 2_000_000) return #err("Chunk too large; max 2,000,000 bytes");
        let chunkKey = keyFor(session_id, chunk_index);
        switch (chunkStorage.get(chunkKey)) {
          case (?_) { return #err("Chunk already uploaded") };
          case null {};
        };
        chunkStorage.put(chunkKey, chunk_data);
        let uploaded = session.uploaded_chunks + 1;
        uploadSessions.put(session_id, { session with uploaded_chunks = uploaded });
        Debug.print("[upload] Uploaded chunk " # Nat.toText(chunk_index + 1) # "/" # Nat.toText(session.chunk_count));
        #ok({
          chunk_index = chunk_index;
          uploaded_chunks = uploaded;
          total_chunks = session.chunk_count;
        });
      };
    };
  };

  public query func get_upload_status(session_id : Text) : async ?UploadSession {
    uploadSessions.get(session_id);
  };

  public shared (msg) func deploy_from_chunks(session_id : Text) : async DeployResult {
    let caller = msg.caller;

    Debug.print("[deploy] Starting from session " # session_id);
    switch (uploadSessions.get(session_id)) {
      case null { return #err("Invalid session ID") };
      case (?session) {
        if (session.uploaded_chunks != session.chunk_count) {
          return #err("Missing chunks: " # Nat.toText(session.uploaded_chunks) # "/" # Nat.toText(session.chunk_count));
        };
        // Reassemble
        var assembled : [var Nat8] = Array.init<Nat8>(session.total_size, 0);
        var offset : Nat = 0;
        var i : Nat = 0;
        while (i < session.chunk_count) {
          let key = keyFor(session_id, i);
          switch (chunkStorage.get(key)) {
            case null { return #err("Missing chunk " # Nat.toText(i)) };
            case (?chunk) {
              let arr = Blob.toArray(chunk);
              if (offset + arr.size() > session.total_size) {
                return #err("Size mismatch while assembling");
              };
              var j : Nat = 0;
              while (j < arr.size()) {
                assembled[offset] := arr[j];
                offset += 1;
                j += 1;
              };
            };
          };
          i += 1;
        };
        if (offset != session.total_size) {
          return #err("Size mismatch: expected " # Nat.toText(session.total_size) # ", got " # Nat.toText(offset));
        };

        let wasm_module : Blob = Blob.fromArray(Array.freeze(assembled));

        // Create canister with cycles
        let cycles_to_send : Nat = 1_500_000_000_000; // 1.5T cycles
        let create_args : CreateCanisterArgs = {
          settings = ?{
            controllers = ?[Principal.fromActor(Main), caller, APP_WALLET];
            compute_allocation = null;
            memory_allocation = null;
            freezing_threshold = null;
          };
        };
        Cycles.add<system>(cycles_to_send);
        let create_res = await ic.create_canister(create_args);
        let new_id = create_res.canister_id;

        // Install code (single-shot)
        let install_args : InstallCodeArgs = {
          mode = #install;
          canister_id = new_id;
          wasm_module = wasm_module;
          arg = emptyBlob;
        };
        await ic.install_code(install_args);

        // Record deployment
        let idTxt = shortIdNow(wasm_module);
        let record : DeploymentRecord = {
          canister_id = Principal.toText(new_id);
          wasm_hash = idTxt;
          deployed_at = Time.now();
          original_size = blobSize(wasm_module);
          compressed_size = blobSize(wasm_module);
        };
        let deployment_id = idTxt # "_" # Int.toText(Time.now());
        deploymentsMap.put(deployment_id, record);

        // Mark session completed and cleanup chunks
        uploadSessions.put(session_id, { session with completed = true });
        var k : Nat = 0;
        while (k < session.chunk_count) {
          let key = keyFor(session_id, k);
          ignore chunkStorage.remove(key);
          k += 1;
        };
        Debug.print("[deploy] Success; new canister " # Principal.toText(new_id));

        // Best-effort post-deploy registration flow
        do {
          // Types to call the deployed agent and registry
          type AgentReturnType = { #Ok : ?Text; #Err : ?Text };
          type DeployedAgent = actor {
            get_metadata : query () -> async AgentReturnType;
          };

          let deployed : DeployedAgent = actor (Principal.toText(new_id));
          // Query newly installed canister for its metadata
          let meta = await deployed.get_metadata();
          switch (meta) {
            case (#Ok(?jsonTxt)) {
              // Attempt to parse agent name from JSON
              switch (extractAgentName(jsonTxt)) {
                case (?agentName) {
                  Debug.print("[deploy] Extracted agent name: " # agentName);
                  try {
                    let regRes = await registry.register_agent(agentName, Principal.toText(new_id));
                    switch (regRes) {
                      case (#Ok(_)) Debug.print("[deploy] Agent registered: " # agentName);
                      case (#Err(?e)) Debug.print("[deploy][warn] Registry returned error: " # e);
                      case (#Err(null)) Debug.print("[deploy][warn] Registry returned unspecified error");
                    };
                  } catch (e) {
                    Debug.print("[deploy][warn] Failed to register agent in registry: " # Error.message(e));
                  };
                };
                case null Debug.print("[deploy][warn] Failed to extract agent name from metadata JSON");
              };
            };
            case (#Ok(null)) Debug.print("[deploy][warn] get_metadata returned empty text");
            case (#Err(?e)) Debug.print("[deploy][warn] get_metadata error: " # e);
            case (#Err(null)) Debug.print("[deploy][warn] get_metadata error (unspecified)");
          };
        };

        #ok(record);
      };
    };
  };

  // Helper to parse agent name from metadata JSON string
  func extractAgentName(jsonText : Text) : ?Text {
    switch (Json.parse(jsonText)) {
      case (#ok(parsed)) {
        switch (Json.getAsObject(parsed, "function")) {
          case (#ok(funcObj)) {
            var name : ?Text = null;
            for ((k, v) in funcObj.vals()) {
              if (k == "name") {
                switch (v) {
                  case (#string(t)) { name := ?t };
                  case (_) {};
                };
              };
            };
            name;
          };
          case (#err(_)) null;
        };
      };
      case (#err(_)) null;
    };
  };

  // --- Local helpers ---
  // Convert camelCase or PascalCase to kebab-case (e.g., weatherAgent -> weather-agent)
  func camelToKebab(t : Text) : Text {
    var out : Text = "";
    for (c in Text.toIter(t)) {
      let n = Char.toNat32(c);
      if (n >= 65 and n <= 90) {
        // 'A'..'Z'
        if (out != "") { out #= "-" };
        out #= Char.toText(Char.fromNat32(n + 32)); // to lower
      } else {
        out #= Char.toText(c);
      };
    };
    out;
  };

  // Minimal JSON string escape for \ and " and control newlines
  func jsonEscape(t : Text) : Text {
    var out : Text = "";
    for (c in Text.toIter(t)) {
      switch (Char.toNat32(c)) {
        case 34 { out #= "\\\"" }; // '"'
        case 92 { out #= "\\\\" }; // '\\'
        case 10 { out #= "\\n" }; // newline
        case 13 { out #= "\\r" }; // carriage return
        case 9 { out #= "\\t" }; // tab
        case _ { out #= Char.toText(c) };
      };
    };
    out;
  };

  // Dedupe a list of Text while preserving order
  func dedupePreserveOrder(arr : [Text]) : [Text] {
    let seen = HashMap.HashMap<Text, Bool>(arr.size(), Text.equal, Text.hash);
    var acc : [Text] = [];
    for (v in arr.vals()) {
      switch (seen.get(v)) {
        case null { seen.put(v, true); acc := Array.append<Text>(acc, [v]) };
        case (?_) {};
      };
    };
    acc;
  };
};
