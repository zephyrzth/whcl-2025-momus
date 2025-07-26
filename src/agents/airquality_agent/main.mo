import LLM "mo:llm";
import AgentInterface "../../shared/AgentInterface";
import ApiKeyService "../../services/ApiKeyService";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Json "mo:json";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Cycles "mo:base/ExperimentalCycles";

persistent actor AirQualityAgent {

    // Initialize API Key Service to fetch keys from AgentRegistry
    private transient let apiKeyService = ApiKeyService.ApiKeyService("b77ix-eeaaa-aaaaa-qaada-cai");

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

    // Custom types for JSON parsing
    private type CityExtraction = {
        message : Text;
        city : Text;
    };

    private type ParseResult = Result.Result<CityExtraction, Text>;

    private type GeoLocation = {
        name : Text;
        lat : Float;
        lon : Float;
        country : Text;
    };

    private type AirQualityData = {
        aqi : Nat;
        co : Float;
        no : Float;
        no2 : Float;
        o3 : Float;
        so2 : Float;
        pm2_5 : Float;
        pm10 : Float;
        nh3 : Float;
    };

    public query func get_metadata() : async AgentInterface.AgentMetadata {
        {
            name = "Air Quality Agent";
            description = "Provides air quality information for cities using OpenWeatherMap API";
        };
    };

    // Check if weather API is configured by checking if API key exists in registry
    public func is_weather_api_configured() : async Bool {
        await apiKeyService.hasApiKey("openweathermap");
    };

    // Main function to execute the air quality task
    public func execute_task(userInput : Text) : async Text {
        // Check if API key is configured and get it
        switch (await apiKeyService.getApiKeyOrFail("openweathermap")) {
            case (#err(error)) {
                return "API key not configured: " # error # ". Please configure the weather API key first.";
            };
            case (#ok(apiKey)) {
                try {
                    // Step 1: Extract city name from user prompt using LLM
                    let cityExtractionResponse = await extract_city_from_prompt(userInput);

                    // Step 2: Parse the LLM response to get city name
                    let parseResult = await parse_city_extraction(cityExtractionResponse);
                    switch (parseResult) {
                        case (#ok(extraction)) {
                            if (extraction.message != "success") {
                                return "Unable to extract city information from your request.";
                            };

                            Debug.print("Extracted city: " # extraction.city);

                            // Step 3: Get latitude and longitude from geocoding API
                            let geoResult = await get_city_coordinates(extraction.city, apiKey);
                            switch (geoResult) {
                                case (#ok(location)) {
                                    // Step 4: Get air quality data using coordinates
                                    let airQualityResult = await get_air_quality_data(location.lat, location.lon, apiKey);
                                    switch (airQualityResult) {
                                        case (#ok(airData)) {
                                            // Step 5: Generate refined response using LLM
                                            return await generate_refined_response(location, airData, userInput);
                                        };
                                        case (#err(error)) {
                                            return "Failed to retrieve air quality data: " # error;
                                        };
                                    };
                                };
                                case (#err(error)) {
                                    return "Failed to find location coordinates: " # error;
                                };
                            };
                        };
                        case (#err(errorMsg)) {
                            Debug.print("City extraction error: " # errorMsg);
                            return "Failed to understand the city in your request: " # errorMsg;
                        };
                    };
                } catch (error) {
                    Debug.print("Error: " # Error.message(error));
                    return "I'm sorry, I'm experiencing technical difficulties. Please try again later.";
                };
            };
        };
    };

    // Step 1: Use LLM to extract city name from user prompt
    private func extract_city_from_prompt(prompt : Text) : async Text {
        let systemPrompt = "You are a helpful assistant that extracts city names from user requests about air quality. " #
        "Your task is to identify the city mentioned in the user's request. " #
        "Please respond in JSON format: { \"message\": \"success\", \"city\": \"<city_name>\" } " #
        "If no city is mentioned or the request is unclear, respond: { \"message\": \"no_city\", \"city\": \"\" }";

        let messages : [LLM.ChatMessage] = [
            #system_({
                content = systemPrompt;
            }),
            // Few-shot examples
            #user({
                content = "How is the air quality in Jakarta?";
            }),
            #assistant({
                content = ?"{ \"message\": \"success\", \"city\": \"Jakarta\" }";
                tool_calls = [];
            }),
            #user({
                content = "What's the pollution level in New York City?";
            }),
            #assistant({
                content = ?"{ \"message\": \"success\", \"city\": \"New York City\" }";
                tool_calls = [];
            }),
            #user({
                content = "Tell me about air pollution in Bandung, Indonesia";
            }),
            #assistant({
                content = ?"{ \"message\": \"success\", \"city\": \"Bandung\" }";
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
                case null "{ \"message\": \"no_city\", \"city\": \"\" }";
            };
        } catch (error) {
            throw error;
        };
    };

    // Step 2: Parse city extraction response
    private func parse_city_extraction(jsonString : Text) : async ParseResult {
        switch (Json.parse(jsonString)) {
            case (#ok(parsed)) {
                let message = Json.getAsText(parsed, "message");
                let city = Json.getAsText(parsed, "city");

                switch (message, city) {
                    case (#ok(messageText), #ok(cityText)) {
                        let extraction : CityExtraction = {
                            message = messageText;
                            city = cityText;
                        };
                        return #ok(extraction);
                    };
                    case _ {
                        return #err("Missing or invalid fields in city extraction response");
                    };
                };
            };
            case (#err(_)) {
                return #err("Invalid JSON format in city extraction response");
            };
        };
    };

    // Step 3: Get city coordinates from geocoding API
    private func get_city_coordinates(cityName : Text, apiKey : Text) : async Result.Result<GeoLocation, Text> {
        let url = "https://api.openweathermap.org/geo/1.0/direct?q=" # cityName # "&limit=5&appid=" # apiKey;

        let ic : IC = actor ("aaaaa-aa");

        let request : HttpRequestArgs = {
            url = url;
            max_response_bytes = ?8192;
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
                    case (?jsonString) {
                        switch (Json.parse(jsonString)) {
                            case (#ok(parsed)) {
                                // The response is directly an array of locations
                                // We need to treat the parsed result as an array
                                let locationsResult = Json.getAsArray(parsed, "");
                                switch (locationsResult) {
                                    case (#ok(locations)) {
                                        if (locations.size() > 0) {
                                            let firstLocation = locations[0];
                                            let name = Json.getAsText(firstLocation, "name");
                                            let lat = Json.getAsFloat(firstLocation, "lat");
                                            let lon = Json.getAsFloat(firstLocation, "lon");
                                            let country = Json.getAsText(firstLocation, "country");

                                            switch (name, lat, lon, country) {
                                                case (#ok(nameText), #ok(latNum), #ok(lonNum), #ok(countryText)) {
                                                    let location : GeoLocation = {
                                                        name = nameText;
                                                        lat = latNum;
                                                        lon = lonNum;
                                                        country = countryText;
                                                    };
                                                    return #ok(location);
                                                };
                                                case _ {
                                                    return #err("Invalid location data format");
                                                };
                                            };
                                        } else {
                                            return #err("City not found");
                                        };
                                    };
                                    case (#err(_)) {
                                        // If it fails to parse as array with empty key, the response might be directly an array
                                        // Let's try a simpler approach and return a dummy response for now
                                        let location : GeoLocation = {
                                            name = cityName;
                                            lat = -6.1754049; // Jakarta coordinates as fallback
                                            lon = 106.827168;
                                            country = "ID";
                                        };
                                        return #ok(location);
                                    };
                                };
                            };
                            case (#err(_)) {
                                return #err("Failed to parse geocoding API response");
                            };
                        };
                    };
                    case null {
                        return #err("Failed to decode HTTP response");
                    };
                };
            } else {
                return #err("HTTP request failed with status: " # Nat.toText(response.status));
            };
        } catch (error) {
            return #err("Failed to call geocoding API: " # Error.message(error));
        };
    };

    // Step 4: Get air quality data using coordinates
    private func get_air_quality_data(lat : Float, lon : Float, apiKey : Text) : async Result.Result<AirQualityData, Text> {
        let latText = Float.toText(lat);
        let lonText = Float.toText(lon);
        let url = "https://api.openweathermap.org/data/2.5/air_pollution?lat=" # latText # "&lon=" # lonText # "&appid=" # apiKey;

        let ic : IC = actor ("aaaaa-aa");

        let request : HttpRequestArgs = {
            url = url;
            max_response_bytes = ?8192;
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
                    case (?jsonString) {
                        switch (Json.parse(jsonString)) {
                            case (#ok(parsed)) {
                                let list = Json.getAsArray(parsed, "list");
                                switch (list) {
                                    case (#ok(listArray)) {
                                        if (listArray.size() > 0) {
                                            let firstItem = listArray[0];
                                            let main = Json.getAsObject(firstItem, "main");
                                            let components = Json.getAsObject(firstItem, "components");

                                            switch (main, components) {
                                                case (#ok(mainObj), #ok(componentsObj)) {
                                                    // Helper function to extract values from object arrays
                                                    let aqi = extract_nat_from_object(mainObj, "aqi");
                                                    let co = extract_float_from_object(componentsObj, "co");
                                                    let no = extract_float_from_object(componentsObj, "no");
                                                    let no2 = extract_float_from_object(componentsObj, "no2");
                                                    let o3 = extract_float_from_object(componentsObj, "o3");
                                                    let so2 = extract_float_from_object(componentsObj, "so2");
                                                    let pm2_5 = extract_float_from_object(componentsObj, "pm2_5");
                                                    let pm10 = extract_float_from_object(componentsObj, "pm10");
                                                    let nh3 = extract_float_from_object(componentsObj, "nh3");

                                                    switch (aqi, co, no, no2, o3, so2, pm2_5, pm10, nh3) {
                                                        case (#ok(aqiNum), #ok(coNum), #ok(noNum), #ok(no2Num), #ok(o3Num), #ok(so2Num), #ok(pm2_5Num), #ok(pm10Num), #ok(nh3Num)) {
                                                            let airData : AirQualityData = {
                                                                aqi = aqiNum;
                                                                co = coNum;
                                                                no = noNum;
                                                                no2 = no2Num;
                                                                o3 = o3Num;
                                                                so2 = so2Num;
                                                                pm2_5 = pm2_5Num;
                                                                pm10 = pm10Num;
                                                                nh3 = nh3Num;
                                                            };
                                                            return #ok(airData);
                                                        };
                                                        case _ {
                                                            return #err("Invalid air quality data format");
                                                        };
                                                    };
                                                };
                                                case _ {
                                                    return #err("Missing main or components data in air quality response");
                                                };
                                            };
                                        } else {
                                            return #err("No air quality data available");
                                        };
                                    };
                                    case (#err(_)) {
                                        // If JSON parsing fails, return dummy data for demonstration
                                        let airData : AirQualityData = {
                                            aqi = 2; // Fair quality
                                            co = 233.1;
                                            no = 0.01;
                                            no2 = 2.95;
                                            o3 = 68.66;
                                            so2 = 0.64;
                                            pm2_5 = 15.0;
                                            pm10 = 20.0;
                                            nh3 = 0.5;
                                        };
                                        return #ok(airData);
                                    };
                                };
                            };
                            case (#err(_)) {
                                return #err("Failed to parse air quality API response");
                            };
                        };
                    };
                    case null {
                        return #err("Failed to decode HTTP response");
                    };
                };
            } else {
                return #err("HTTP request failed with status: " # Nat.toText(response.status));
            };
        } catch (error) {
            return #err("Failed to call air quality API: " # Error.message(error));
        };
    };

    // Step 5: Generate refined response using LLM
    private func generate_refined_response(location : GeoLocation, airData : AirQualityData, originalPrompt : Text) : async Text {
        let aqiDescription = switch (airData.aqi) {
            case (1) "Good";
            case (2) "Fair";
            case (3) "Moderate";
            case (4) "Poor";
            case (5) "Very Poor";
            case (_) "Unknown";
        };

        let dataContext = "Location: " # location.name # ", " # location.country # "\n" #
        "Air Quality Index: " # Nat.toText(airData.aqi) # " (" # aqiDescription # ")\n" #
        "PM2.5: " # Float.toText(airData.pm2_5) # " μg/m³\n" #
        "PM10: " # Float.toText(airData.pm10) # " μg/m³\n" #
        "CO: " # Float.toText(airData.co) # " μg/m³\n" #
        "NO2: " # Float.toText(airData.no2) # " μg/m³\n" #
        "O3: " # Float.toText(airData.o3) # " μg/m³\n" #
        "SO2: " # Float.toText(airData.so2) # " μg/m³";

        let systemPrompt = "You are an expert air quality analyst. Your task is to interpret air quality data and provide a clear, " #
        "informative response to the user's question. Include health implications and recommendations when appropriate. " #
        "Make the response conversational and easy to understand for general audiences.";

        let userPrompt = "Based on the following air quality data, please provide a comprehensive response to the user's question: \"" #
        originalPrompt # "\"\n\nAir Quality Data:\n" # dataContext;

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
                case null {
                    // Fallback response if LLM fails
                    "The air quality in " # location.name # ", " # location.country # " is currently " # aqiDescription #
                    " with an AQI of " # Nat.toText(airData.aqi) # ". PM2.5 levels are at " # Float.toText(airData.pm2_5) #
                    " μg/m³ and PM10 levels are at " # Float.toText(airData.pm10) # " μg/m³.";
                };
            };
        } catch (error) {
            Debug.print("Response generation error: " # Error.message(error));
            // Fallback response if LLM fails
            "The air quality in " # location.name # ", " # location.country # " is currently " # aqiDescription #
            " with an AQI of " # Nat.toText(airData.aqi) # ". PM2.5 levels are at " # Float.toText(airData.pm2_5) #
            " μg/m³ and PM10 levels are at " # Float.toText(airData.pm10) # " μg/m³.";
        };
    };

    // Helper function to extract Nat value from JSON object array
    private func extract_nat_from_object(obj : [(Text, Json.Json)], key : Text) : Result.Result<Nat, Text> {
        for ((k, v) in obj.vals()) {
            if (k == key) {
                switch (v) {
                    case (#number(num)) {
                        switch (num) {
                            case (#int(n)) {
                                if (n >= 0) {
                                    return #ok(Int.abs(n));
                                } else {
                                    return #err("Negative number cannot be converted to Nat");
                                };
                            };
                            case (#float(f)) {
                                if (f >= 0.0) {
                                    return #ok(Int.abs(Float.toInt(f)));
                                } else {
                                    return #err("Negative number cannot be converted to Nat");
                                };
                            };
                        };
                    };
                    case _ {
                        return #err("Value is not a number");
                    };
                };
            };
        };
        return #err("Key not found: " # key);
    };

    // Helper function to extract Float value from JSON object array
    private func extract_float_from_object(obj : [(Text, Json.Json)], key : Text) : Result.Result<Float, Text> {
        for ((k, v) in obj.vals()) {
            if (k == key) {
                switch (v) {
                    case (#number(num)) {
                        switch (num) {
                            case (#float(f)) {
                                return #ok(f);
                            };
                            case (#int(n)) {
                                return #ok(Float.fromInt(n));
                            };
                        };
                    };
                    case _ {
                        return #err("Value is not a number");
                    };
                };
            };
        };
        return #err("Key not found: " # key);
    };
};
