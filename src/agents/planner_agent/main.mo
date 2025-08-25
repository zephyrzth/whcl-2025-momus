import LLM "mo:llm";
import AgentInterface "../../shared/AgentInterface";
import AgentRegistryInterface "../../shared/AgentRegistryInterface";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Array "mo:base/Array";
import Json "mo:json";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Blob "mo:base/Blob";

persistent actor PlannerAgent {

  // --- Ownership & Pricing (for this agent itself) ---
  private var owner : Principal = Principal.fromActor(PlannerAgent);

  public query func get_owner() : async Principal { owner };
  public query func get_price() : async Nat { 0 };
  public shared (msg) func set_owner(newOwner : Principal) : async Bool {
    if (msg.caller != owner) { return false };
    owner := newOwner;
    true;
  };

  // --- ICP Ledger & Fee Config ---
  // Constant ICP Ledger canister id (can be changed later if needed)
  private let ledgerCanisterId : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";
  // Fixed 10% fee
  let FEE_NUM : Nat = 10; // percent
  let FEE_DEN : Nat = 100;
  let APP_WALLET : Principal = Principal.fromText("bacwk-6nib6-4xdaa-s6fj7-s3h6j-zdzd3-jxvfw-yf3ss-dt4if-h6p6w-lae");

  private func compute_fee(amount : Nat) : Nat {
    (amount * FEE_NUM) / FEE_DEN;
  };

  // Minimal ICP Ledger interface (ICRC-1/2) used by planner
  private type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  private type TransferArg = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  private type Icrc1TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld : ();
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable : ();
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };

  private type Icrc1TransferResult = {
    #Ok : Nat;
    #Err : Icrc1TransferError;
  };

  private type TransferFromArgs = {
    spender_subaccount : ?Blob;
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  private type TransferFromError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #InsufficientAllowance : { allowance : Nat };
    #TooOld : ();
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable : ();
    #GenericError : { error_code : Nat; message : Text };
  };

  private type TransferFromResult = {
    #Ok : Nat;
    #Err : TransferFromError;
  };

  private type Ledger = actor {
    icrc1_transfer : (TransferArg) -> async Icrc1TransferResult;
    icrc2_transfer_from : (TransferFromArgs) -> async TransferFromResult;
  };

  // Process ICP payment: charge caller and split to owner and app wallet.
  // Returns #ok on success (or partial success on payouts), #err with a user-visible message on failure to charge.
  private func process_payment(fromUser : Principal, agentPrice : Nat, agentOwner : Principal) : async Result.Result<(), Text> {
    if (ledgerCanisterId == "") {
      return #err("ICP ledger not configured");
    };

    let ledger : Ledger = actor (ledgerCanisterId);
    let toPlanner = Principal.fromActor(PlannerAgent);
    let adminFee = compute_fee(agentPrice);
    let toOwnerAmt : Nat = agentPrice - adminFee;

    // Charge caller -> planner
    let tfArgs : TransferFromArgs = {
      spender_subaccount = null;
      from = { owner = fromUser; subaccount = null };
      to = { owner = toPlanner; subaccount = null };
      amount = agentPrice;
      fee = null;
      memo = null;
      created_at_time = null;
    };

    switch (await ledger.icrc2_transfer_from(tfArgs)) {
      case (#Err(err)) {
        Debug.print("ICRC2 transfer_from failed: " # debug_show (err));
        switch (err) {
          case (#InsufficientAllowance(_)) {
            return #err("ICP allowance insufficient");
          };
          case (#InsufficientFunds(_)) {
            return #err("ICP balance insufficient");
          };
          case _ { return #err("error: payment failed") };
        };
      };
      case (#Ok(_)) {
        Debug.print("Transferred " # Nat.toText(agentPrice) # " to planner");

        // Payout owner (best effort)
        let payOwner : TransferArg = {
          from_subaccount = null;
          to = { owner = agentOwner; subaccount = null };
          amount = toOwnerAmt;
          fee = null;
          memo = null;
          created_at_time = null;
        };
        switch (await ledger.icrc1_transfer(payOwner)) {
          case (#Ok(_)) {
            Debug.print("Transferred " # Nat.toText(toOwnerAmt) # " to agent owner");
          };
          case (#Err(e)) {
            Debug.print("ICRC1 transfer to owner failed: " # debug_show (e));
          };
        };

        // Payout app wallet (best effort)
        let payFee : TransferArg = {
          from_subaccount = null;
          to = { owner = APP_WALLET; subaccount = null };
          amount = adminFee;
          fee = null;
          memo = null;
          created_at_time = null;
        };
        switch (await ledger.icrc1_transfer(payFee)) {
          case (#Ok(_)) {
            Debug.print("Transferred " # Nat.toText(adminFee) # " to app wallet");
          };
          case (#Err(e)) {
            Debug.print("ICRC1 transfer of app fee failed: " # debug_show (e));
          };
        };

        return #ok(());
      };
    };
  };

  // Direct access to registry for canister resolution
  private let registry : AgentRegistryInterface.AgentRegistryInterface = actor ("umunu-kh777-77774-qaaca-cai");

  // Custom types for JSON parsing
  private type AgentInfo = {
    name : Text;
    refined_request : Text;
  };

  private type PlannerResponse = {
    message : Text;
    agents : [AgentInfo];
  };

  private type ParseResult = Result.Result<PlannerResponse, Text>;

  private type AggregatorPlannerInput = {
    refined_request : Text;
    response : Text;
  };

  // Fixed typo: get_metada -> get_metadata
  public query func get_metadata() : async AgentInterface.AgentMetadata {
    {
      name = "Planner Agent";
      description = "Routes user requests to weather_agent and/or air_quality_agent using LLM analysis";
    };
  };

  // Enhanced execute_task with proper error handling
  public shared (msg) func execute_task(userInput : Text) : async Text {
    try {
      let resp = await run_planner(userInput);

      // Use the new parsing function
      let parseResult = await parse_planner_response(resp);
      switch (parseResult) {
        case (#ok(plannerResponse)) {
          // Check if message indicates success
          if (plannerResponse.message != "success") {
            return "No agent available for the request.";
          };

          // Check if we have agents
          if (plannerResponse.agents.size() == 0) {
            return "No agent available for the request.";
          };

          // Build response using the parsed data
          var responses : [AggregatorPlannerInput] = [];

          for (agentInfo in plannerResponse.agents.vals()) {
            Debug.print("Routing to agent: " # agentInfo.name # " with request: " # agentInfo.refined_request);
            // Resolve agent canister id
            let canisterIdOpt = await registry.getAgentCanister(agentInfo.name);
            switch (canisterIdOpt) {
              case (?cid) {
                let agentActor : AgentInterface.AgentInterface = actor (cid);
                let agentPrice = await agentActor.get_price();
                let agentOwner = await agentActor.get_owner();

                // Charge caller and handle payouts
                let paymentRes = await process_payment(msg.caller, agentPrice, agentOwner);
                switch (paymentRes) {
                  case (#err(msg)) { return msg };
                  case (#ok(())) {};
                };
              };
              case null {
                Debug.print("Unknown agent: " # agentInfo.name);
              };
            };

            let result = await registry.executeAgentTask(agentInfo.name, agentInfo.refined_request);
            switch (result) {
              case (#ok(response)) {
                responses := Array.append(responses, [{ refined_request = agentInfo.refined_request; response = response }]);
              };
              case (#err(error)) {
                let errorResponse = "Error calling " # agentInfo.name # " agent: " # error;
                responses := Array.append(responses, [{ refined_request = agentInfo.refined_request; response = errorResponse }]);
              };
            };
          };

          // Use the new aggregation function to combine responses
          return await aggregate_agent_responses(responses);
        };
        case (#err(errorMsg)) {
          Debug.print("JSON parsing error: " # errorMsg);
          return "Failed to parse LLM response: " # errorMsg;
        };
      };
    } catch (error) {
      Debug.print("Error: " # Error.message(error));
      "I'm sorry, I'm experiencing technical difficulties. Please try again later or rephrase your request.";
    };
  };

  private func run_planner(prompt : Text) : async Text {
    let systemPrompt = "You are a helpful assistant that routes user requests to the appropriate agents based on the content of the request. Also you need to refine the user request for more accurate " #
    "Currently we are able to handle 2 topics, weather and air quality ." #
    "Agent Name List: `weather_agent`, `air_quality_agent`." #
    "Please response it in the form of json format, { \"message\": \"success\", \"agents\": [ { \"name\": \"<agent_name>\", \"refined_request\": \"<refined_request>\" } ] }" #
    "Fallback response: { \"message\": \"no_agent\", \"agents\": [] }";

    let messages : [LLM.ChatMessage] = [
      #system_({
        content = systemPrompt;
      }),
      // Few-shot example 1: Weather request
      #user({
        content = "How is the weather today in Jakarta?";
      }),
      #assistant({
        content = ?"{ \"message\": \"success\", \"agents\": [ { \"name\": \"weather_agent\", \"refined_request\": \"What is the weather like today in Jakarta?\" } ] }";
        tool_calls = [];
      }),
      // Few-shot example 2: Air quality request
      #user({
        content = "How is the air quality in Bandung?";
      }),
      #assistant({
        content = ?"{ \"message\": \"success\", \"agents\": [ { \"name\": \"air_quality_agent\", \"refined_request\": \"What is the air quality like in Bandung?\" } ] }";
        tool_calls = [];
      }),
      #user({
        content = "How is today in Surabaya?";
      }),
      #assistant({
        content = ?"{ \"message\": \"success\", \"agents\": [ { \"name\": \"weather_agent\", \"refined_request\": \"What is the weather like today in Surabaya?\" }, { \"name\": \"air_quality_agent\", \"refined_request\": \"What is the air quality like today in Surabaya?\" } ] }";
        tool_calls = [];
      }),
      #user({
        content = prompt;
      }),
    ];

    try {
      let response = await LLM.chat(#Llama3_1_8B).withMessages(messages).send();
      switch (response.message.content) {
        case (?text) text;
        case null "I couldn't generate a response. Please try again.";
      };
    } catch (error) {
      throw error;
    };

  };

  // Function to parse JSON response to custom type (extracted from execute_task logic)
  private func parse_planner_response(jsonString : Text) : async ParseResult {

    switch (Json.parse(jsonString)) {
      case (#ok(parsed)) {
        let message = Json.getAsText(parsed, "message");

        switch (message) {
          case (#ok(messageText)) {
            let agents = Json.getAsArray(parsed, "agents");

            switch (agents) {
              case (#ok(agentsArray)) {
                var agentInfos : [AgentInfo] = [];

                for (agent in agentsArray.vals()) {
                  let agentName = Json.getAsText(agent, "name");
                  let refinedRequest = Json.getAsText(agent, "refined_request");

                  switch (agentName, refinedRequest) {
                    case (#ok(name), #ok(request)) {
                      let agentInfo : AgentInfo = {
                        name = name;
                        refined_request = request;
                      };
                      agentInfos := Array.append(agentInfos, [agentInfo]);
                    };
                    case _ {
                      return #err("Error processing agent data: missing name or refined_request field");
                    };
                  };
                };

                let plannerResponse : PlannerResponse = {
                  message = messageText;
                  agents = agentInfos;
                };

                return #ok(plannerResponse);
              };
              case (#err(_)) {
                return #err("Missing or invalid 'agents' field in JSON");
              };
            };
          };
          case (#err(_)) {
            return #err("Missing or invalid 'message' field in JSON");
          };
        };
      };
      case (#err(_)) {
        return #err("Invalid JSON format");
      };
    };
  };

  // Function to aggregate multiple agent responses into a coherent answer
  public func aggregate_agent_responses(responses : [AggregatorPlannerInput]) : async Text {

    if (responses.size() == 0) {
      return "No agent responses to aggregate.";
    };

    // Build the context for LLM aggregation
    var contextBuilder : [Text] = [];

    for (response in responses.vals()) {
      let formattedResponse = "Request: " # response.refined_request # "\nResponse: " # response.response;
      contextBuilder := Array.append(contextBuilder, [formattedResponse]);
    };

    let aggregatedContext = Text.join("\n\n", contextBuilder.vals());

    let systemPrompt = "You are a helpful assistant that aggregates and synthesizes responses from multiple specialized agents. " #
    "Your task is to combine the provided information into a single, coherent, and well-structured answer. " #
    "Make sure to include all relevant information while maintaining clarity and natural flow. " #
    "If there are multiple topics covered, organize them logically and provide a comprehensive response.";

    let userPrompt = "Please aggregate and refine the following agent responses into a single, coherent answer:\n\n" # aggregatedContext;

    let messages : [LLM.ChatMessage] = [
      #system_({
        content = systemPrompt;
      }),
      #user({
        content = userPrompt;
      }),
    ];

    try {
      let response = await LLM.chat(#Llama3_1_8B).withMessages(messages).send();
      switch (response.message.content) {
        case (?text) text;
        case null "I couldn't aggregate the responses. Please try again.";
      };
    } catch (error) {
      Debug.print("Aggregation error: " # Error.message(error));
      // Fallback: return simple concatenation if LLM fails
      var fallbackResponse : [Text] = [];
      for (response in responses.vals()) {
        fallbackResponse := Array.append(fallbackResponse, [response.response]);
      };
      Text.join(" | ", fallbackResponse.vals());
    };

  };
};
