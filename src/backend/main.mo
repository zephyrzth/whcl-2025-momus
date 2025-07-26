import LLM "mo:llm";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Result "mo:base/Result";
import _Debug "mo:base/Debug";
import Cycles "mo:base/ExperimentalCycles";
import Blob "mo:base/Blob";
import _Array "mo:base/Array";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Json "mo:json";
import Array "mo:base/Array";

persistent actor Main {
    // Counter variable to keep track of count
    private var counter : Nat64 = 0;
    
    // Weather API configuration
    private var weatherApiKey : Text = "";

    // Canvas state storage
    private var canvasState : ?CanvasState = null;

    // Type definition for the location response from LLM
    public type LocationResponse = {
        message: Text;    // "success" or "failed"
        reason: Text;     // error reason or empty string for success
        city: Text;       // city name or empty string
        latlon: [Float];  // array of Float values [latitude, longitude]
    };

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

    // HTTP Outcall types for external API calls
    public type HttpRequestArgs = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HttpHeader];
        body : ?[Nat8];
        method : HttpMethod;
        transform : ?TransformRawResponseFunction;
    };

    public type HttpHeader = {
        name : Text;
        value : Text;
    };

    public type HttpMethod = {
        #get;
        #post;
        #head;
    };

    public type HttpResponsePayload = {
        status : Nat;
        headers : [HttpHeader];
        body : [Nat8];
    };

    public type TransformRawResponseFunction = {
        function : shared query TransformRawResponse -> async HttpResponsePayload;
        context : Blob;
    };

    public type TransformRawResponse = {
        status : Nat;
        body : [Nat8];
        headers : [HttpHeader];
    };

    public type IC = actor {
        http_request : HttpRequestArgs -> async HttpResponsePayload;
    };

    // Initialize the canister with weather API key
    public func init_weather_api(apiKey: Text) : async () {
        weatherApiKey := apiKey;
    };

    // Check if weather API is configured
    public query func is_weather_api_configured() : async Bool {
        weatherApiKey != ""
    };

    public func execute_task(prompt: Text) : async Text {
        let locationData = await get_location_data_via_llm(prompt);
        switch (locationData.message) {
            case "success" {
                // Call weather API with extracted location data
                if (locationData.city != "") {
                    // Fetch weather data by city name
                    let weatherData = await get_weather_via_http_outcall(locationData.city, "city");
                    _Debug.print("🔍 DEBUG: Weather data response: " # debug_show(weatherData));
                    switch (weatherData) {
                        case (#ok(jsonText)) {
                            // Process the JSON response and return it
                            let weatherRecommendation = await get_weather_recommendation_via_llm(jsonText);
                            return weatherRecommendation; // Return the recommendation from LLM
                        };
                        case (#err(error)) "Error fetching weather data: " # error;
                    };
                } else if (locationData.latlon.size() == 2) {
                    // Fetch weather data by coordinates
                    let lat = Float.toText(locationData.latlon[0]);
                    let lon = Float.toText(locationData.latlon[1]);
                    let latlonString = lat # "," # lon;
                    let weatherData = await get_weather_via_http_outcall(latlonString, "coordinates");
                    _Debug.print("🔍 DEBUG: Weather data response: " # debug_show(weatherData));
                    switch (weatherData) {
                        case (#ok(jsonText)) {
                            // Process the JSON response and return it
                            let weatherRecommendation = await get_weather_recommendation_via_llm(jsonText);
                            return weatherRecommendation; // Return the recommendation from LLM
                        };
                        case (#err(error)) "Error fetching weather data: " # error;
                    };
                } else {
                    "No valid location data provided";
                };
            };

            case "failed" {
                return "Failed to fetch weather data: " # locationData.reason;
            };

            case (_) {
                return "Internal Error: Unable to process the request.";
            };
        };
    };

    // Private helper function to get location data from user prompt via LLM with retry strategy
    private func get_location_data_via_llm(prompt: Text) : async LocationResponse {
        _Debug.print("🔍 DEBUG: Starting LLM location extraction for prompt: " # prompt);
        
        // Approach 5: Try multiple simpler calls with retry if first times out
        try {
            _Debug.print("🔄 DEBUG: Trying structured prompt to get user's location");
            let complexPrompt = "Extract city or lat lon from User Input and return ONLY VALID JSON TEXT WITH NO OTHER TEXT OR FORMATTING. return: {\"message\":\"success\",\"reason\":\"\",\"city\":\"<cityname>\",\"latlon\":[<lat>,<lon>]}. If not weather-related, return: {\"message\":\"failed\",\"reason\":\"I can only provide weather information\",\"city\":\"\",\"latlon\":[]}. No other text. User Input: " # prompt;
            let complexResponse = await LLM.prompt(#Llama3_1_8B, complexPrompt);
            _Debug.print("✅ DEBUG: Complex LLM call succeeded: " # complexResponse);
            
            // Parse the complex LLM response
            let parsedData = parse_llm_location_response(complexResponse);
            _Debug.print("✅ DEBUG: Parsed data: " # debug_show(parsedData));
            parsedData;
            
        } catch (_error) {
            return {
                message = "failed";
                reason = "Error fetching user location data from LLM";
                city = "";
                latlon = [];
            };
        };
    };
    
    // Helper function to parse LLM location response JSON
    private func parse_llm_location_response(_jsonResponse: Text) : LocationResponse {
        switch (Json.parse(_jsonResponse)) {
            case (#ok(parsed)) {
                let message = Json.getAsText(parsed, "message");
                switch (message) {
                    case (#ok(messageText)) {
                        let latlons = Json.getAsArray(parsed, "latlon");
                        switch (latlons) {
                            case (#ok(latlonArray)) {
                                var coordinates : [Float] = [];
                                for (coord in latlonArray.vals()) {
                                    // Extract Float value directly from JSON value
                                    switch (coord) {
                                        case (#number(#float(floatValue))) {
                                            coordinates := Array.append(coordinates, [floatValue]);
                                        };
                                        case (#number(#int(intValue))) {
                                            coordinates := Array.append(coordinates, [Float.fromInt(intValue)]);
                                        };
                                        case (_) {
                                            // Skip invalid coordinates
                                        };
                                    };
                                };
                                
                                // Get city and reason fields
                                let city = switch (Json.getAsText(parsed, "city")) {
                                    case (#ok(cityText)) cityText;
                                    case (#err(_)) "";
                                };
                                
                                let reason = switch (Json.getAsText(parsed, "reason")) {
                                    case (#ok(reasonText)) reasonText;
                                    case (#err(_)) "";
                                };

                                return {
                                    message = messageText;
                                    reason = reason;
                                    city = city;
                                    latlon = coordinates;
                                };
                            };
                            case (#err(_)) {
                                // Return error response for invalid latlon array
                                return {
                                    message = "failed";
                                    reason = "Invalid latlon array in JSON";
                                    city = "";
                                    latlon = [];
                                };
                            };
                        };
                    };
                    case (#err(_)) {
                        return {
                            message = "failed";
                            reason = "Missing or invalid 'message' field in JSON";
                            city = "";
                            latlon = [];
                        };
                    };
                };
            };
            case (#err(_)) {
                return {
                    message = "failed";
                    reason = "Invalid JSON format";
                    city = "";
                    latlon = [];
                };
            };
        };
    };

    // Private helper function to get weather recommendation via LLM
    private func get_weather_recommendation_via_llm(weatherJsonResponse: Text) : async Text {
        let fullPrompt = "Give brief information about the current weather in the location, and clothing advice based on weather data. Respond in 2-3 lines max. Weather JSON: " # weatherJsonResponse;

        try {
            // Use LLM.prompt instead of LLM.chat for potentially better timeout handling
            let llmResponse = await LLM.prompt(#Llama3_1_8B, fullPrompt);
            llmResponse;
        } catch (_error) {
            "Error generating recommendation. Please try again.";
        };
    };

    // HTTP outcall method to fetch raw weather JSON from OpenWeatherMap API
    public func get_weather_via_http_outcall(location: Text, locationType: Text) : async Result.Result<Text, Text> {
        // Check if API key is configured
        if (weatherApiKey == "") {
            return #err("API key not configured");
        };

        let ic : IC = actor ("aaaaa-aa");
        
        // Build the URL based on location type
        let url = if (locationType == "coordinates") {
            // Parse coordinates from location string (format: "lat,lon")
            let parts = Text.split(location, #char(','));
            let partsArray = Iter.toArray(parts);
            if (partsArray.size() == 2) {
                "https://api.openweathermap.org/data/2.5/weather?lat=" # partsArray[0] # "&lon=" # partsArray[1] # "&appid=" # weatherApiKey # "&units=metric";
            } else {
                "https://api.openweathermap.org/data/2.5/weather?q=" # location # "&appid=" # weatherApiKey # "&units=metric";
            }
        } else {
            // Default to city search
            "https://api.openweathermap.org/data/2.5/weather?q=" # location # "&appid=" # weatherApiKey # "&units=metric";
        };

        let request : HttpRequestArgs = {
            url = url;
            max_response_bytes = ?2048;
            headers = [];
            body = null;
            method = #get;
            transform = null;
        };

        try {
            Cycles.add<system>(230_949_972_000);
            let response = await ic.http_request(request);
            
            if (response.status == 200) {
                // Return the raw JSON response
                let responseText = Text.decodeUtf8(Blob.fromArray(response.body));
                switch (responseText) {
                    case (?text) {
                        #ok(text); // Return raw JSON as-is
                    };
                    case null {
                        #err("Failed to decode response");
                    };
                };
            } else {
                #err("HTTP request failed with status: " # Nat.toText(response.status));
            };
        } catch (_error) {
            #err("Network error occurred");
        };
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

    // Debug function to see the actual HTTP response
    public func debug_weather_response(location: Text) : async Text {
        if (weatherApiKey == "") {
            return "API key not configured";
        };

        let ic : IC = actor ("aaaaa-aa");
        let url = "https://api.openweathermap.org/data/2.5/weather?q=" # location # "&appid=" # weatherApiKey # "&units=metric";

        let request : HttpRequestArgs = {
            url = url;
            max_response_bytes = ?2048;
            headers = [];
            body = null;
            method = #get;
            transform = null;
        };

        try {
            Cycles.add<system>(230_949_972_000);
            let response = await ic.http_request(request);
            
            if (response.status == 200) {
                let responseText = Text.decodeUtf8(Blob.fromArray(response.body));
                switch (responseText) {
                    case (?text) {
                        text; // Return the actual JSON response
                    };
                    case null {
                        "Failed to decode response";
                    };
                };
            } else {
                "HTTP request failed with status: " # Nat.toText(response.status);
            };
        } catch (_error) {
            "Network error occurred";
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
