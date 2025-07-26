import LLM "mo:llm";
import AgentInterface "../../shared/AgentInterface";
import AgentDiscoveryService "../../services/AgentDiscoveryService";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Array "mo:base/Array";
import Json "mo:json";
import Result "mo:base/Result";
import List "mo:base/List";

persistent actor PlannerAgent {

    // Use AgentDiscoveryService to interact with the registry
    private transient let agentDiscovery = AgentDiscoveryService.AgentDiscoveryService("be2us-64aaa-aaaaa-qaabq-cai");

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
    public func execute_task(userInput : Text) : async Text {
        try {
            let resp = await run_planner(userInput);

            Debug.print("LLM response: " # resp);

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

                        if (agentInfo.name == "weather_agent") {
                            let weatherResponse = await dummy_weather_agent(agentInfo.refined_request);
                            responses := Array.append(responses, [{ refined_request = agentInfo.refined_request; response = weatherResponse }]);
                        } else if (agentInfo.name == "air_quality_agent") {
                            let result = await agentDiscovery.executeAgentTask("air_quality_agent", agentInfo.refined_request);
                            switch (result) {
                                case (#ok(response)) {
                                    responses := Array.append(responses, [{ refined_request = agentInfo.refined_request; response = response }]);
                                };
                                case (#err(error)) {
                                    let errorResponse = "Error calling air quality agent: " # error;
                                    responses := Array.append(responses, [{ refined_request = agentInfo.refined_request; response = errorResponse }]);
                                };
                            };
                        } else {
                            Debug.print("Unknown agent: " # agentInfo.name);
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

    private func dummy_weather_agent(_prompt : Text) : async Text {
        // Simulate a response from the weather agent
        return "Weather in Jakarta is sunny with a temperature of 30°C.";
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
