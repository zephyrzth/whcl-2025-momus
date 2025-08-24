import LLM "mo:llm";
import AgentInterface "../../shared/AgentInterface";
import ApiKeyService "../../services/ApiKeyService";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Json "mo:json";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Error "mo:base/Error";
import Principal "mo:base/Principal";
import Cycles "mo:base/ExperimentalCycles";

persistent actor WeatherAgent {

  // Initialize API Key Service to fetch keys from AgentRegistry
  private transient let apiKeyService = ApiKeyService.ApiKeyService("br5f7-7uaaa-aaaaa-qaaca-cai");

  // Type definition for the location response from LLM
  public type LocationResponse = {
    message : Text; // "success" or "failed"
    reason : Text; // error reason or empty string for success
    city : Text; // city name or empty string
    latlon : [Float]; // array of Float values [latitude, longitude]
  };

  // Type definition for parsed weather data from OpenWeatherMap API
  public type ParsedWeatherData = {
    description : Text; // weather description from weather[0].description
    temp : Float; // temperature from main.temp
    feels_like : Float; // feels like temperature from main.feels_like
    visibility : Nat; // visibility in meters
    wind_speed : Float; // wind speed from wind.speed
    city_name : Text; // city name from name field
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

  public query func get_metadata() : async AgentInterface.AgentMetadata {
    {
      name = "Weather Agent";
      description = "Provides real-time weather information for cities using OpenWeatherMap API";
    };
  };

  // Ownership and pricing for MOMUS charges
  public query func get_owner() : async Principal {
    Principal.fromActor(WeatherAgent);
  };
  // Default price: 0.01 ICP (1e8 base units)
  public query func get_price() : async Nat { 1_000_000 };

  // Check if weather API is configured by checking if API key exists in registry
  public func is_weather_api_configured() : async Bool {
    await apiKeyService.hasApiKey("openweathermap");
  };

  public func execute_task(prompt : Text) : async Text {
    // Check if API key is configured and get it
    switch (await apiKeyService.getApiKeyOrFail("openweathermap")) {
      case (#err(error)) {
        return "API key not configured: " # error # ". Please configure the weather API key first.";
      };
      case (#ok(apiKey)) {
        try {
          let locationData = await get_location_data_via_llm(prompt);
          switch (locationData.message) {
            case "success" {
              // Call weather API with extracted location data
              if (locationData.city != "") {
                // Fetch weather data by city name
                let weatherData = await get_weather_via_http_outcall(locationData.city, "city", apiKey);
                Debug.print("🔍 DEBUG: Weather data response: " # debug_show (weatherData));
                switch (weatherData) {
                  case (#ok(parsedData)) {
                    // Convert parsed data to JSON string for LLM
                    let jsonText = "{\"weather\":[{\"description\":\"" # parsedData.description # "\"}],\"main\":{\"temp\":" # Float.toText(parsedData.temp) # ",\"feels_like\":" # Float.toText(parsedData.feels_like) # "},\"visibility\":" # Nat.toText(parsedData.visibility) # ",\"wind\":{\"speed\":" # Float.toText(parsedData.wind_speed) # "},\"name\":\"" # parsedData.city_name # "\"}";
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
                let weatherData = await get_weather_via_http_outcall(latlonString, "coordinates", apiKey);
                Debug.print("🔍 DEBUG: Weather data response: " # debug_show (weatherData));
                switch (weatherData) {
                  case (#ok(parsedData)) {
                    // Convert parsed data to JSON string for LLM
                    let jsonText = "{\"weather\":[{\"description\":\"" # parsedData.description # "\"}],\"main\":{\"temp\":" # Float.toText(parsedData.temp) # ",\"feels_like\":" # Float.toText(parsedData.feels_like) # "},\"visibility\":" # Nat.toText(parsedData.visibility) # ",\"wind\":{\"speed\":" # Float.toText(parsedData.wind_speed) # "},\"name\":\"" # parsedData.city_name # "\"}";
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
        } catch (error) {
          Debug.print("Error: " # Error.message(error));
          return "I'm sorry, I'm experiencing technical difficulties. Please try again later.";
        };
      };
    };
  };

  // Private helper function to get location data from user prompt via LLM with retry strategy
  private func get_location_data_via_llm(prompt : Text) : async LocationResponse {
    Debug.print("🔍 DEBUG: Starting LLM location extraction for prompt: " # prompt);

    try {
      Debug.print("🔄 DEBUG: Trying structured prompt to get user's location");
      let systemPrompt = "Extract location from User Input. Return UNFORMATTED RAW JSON ONLY with this format: {\"message\":\"success\",\"reason\":\"\",\"city\":\"<cityname>\",\"latlon\":[]}. No other text. User Input: " # prompt;
      let llmResponse = await LLM.prompt(#Llama3_1_8B, systemPrompt);
      Debug.print("✅ DEBUG: Fetch Location LLM call succeeded: " # llmResponse);

      // Parse the complex LLM response
      let parsedData = parse_llm_location_response(llmResponse);
      Debug.print("✅ DEBUG: Parsed data: " # debug_show (parsedData));
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
  private func parse_llm_location_response(_jsonResponse : Text) : LocationResponse {
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
  private func get_weather_recommendation_via_llm(weatherJsonResponse : Text) : async Text {
    let fullPrompt = "Give brief information about the current weather in the location, and clothing advice based on weather data. Respond in 2-3 lines max. Weather JSON: " # weatherJsonResponse;

    try {
      // Use LLM.prompt instead of LLM.chat for potentially better timeout handling
      let llmResponse = await LLM.prompt(#Llama3_1_8B, fullPrompt);
      llmResponse;
    } catch (_error) {
      "Error generating recommendation. Please try again.";
    };
  };

  // HTTP outcall method to fetch weather data from OpenWeatherMap API and return parsed structure
  private func get_weather_via_http_outcall(location : Text, locationType : Text, apiKey : Text) : async Result.Result<ParsedWeatherData, Text> {
    let ic : IC = actor ("aaaaa-aa");

    // Build the URL based on location type
    let url = if (locationType == "coordinates") {
      // Parse coordinates from location string (format: "lat,lon")
      let parts = Text.split(location, #char(','));
      let partsArray = Iter.toArray(parts);
      if (partsArray.size() == 2) {
        "https://api.openweathermap.org/data/2.5/weather?lat=" # partsArray[0] # "&lon=" # partsArray[1] # "&appid=" # apiKey # "&units=metric";
      } else {
        "https://api.openweathermap.org/data/2.5/weather?q=" # location # "&appid=" # apiKey # "&units=metric";
      };
    } else {
      // Default to city search
      "https://api.openweathermap.org/data/2.5/weather?q=" # location # "&appid=" # apiKey # "&units=metric";
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
        // Parse the JSON response and return structured data
        let responseText = Text.decodeUtf8(Blob.fromArray(response.body));
        switch (responseText) {
          case (?text) {
            let parsedData = parse_weather_response(text);
            #ok(parsedData); // Return parsed structured data
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

  // Private helper function to parse OpenWeatherMap API response
  private func parse_weather_response(jsonResponse : Text) : ParsedWeatherData {
    switch (Json.parse(jsonResponse)) {
      case (#ok(parsed)) {
        // Extract weather description from weather[0].description
        let description = switch (Json.getAsArray(parsed, "weather")) {
          case (#ok(weatherArray)) {
            if (weatherArray.size() > 0) {
              switch (Json.getAsText(weatherArray[0], "description")) {
                case (#ok(desc)) desc;
                case (#err(_)) "";
              };
            } else {
              "";
            };
          };
          case (#err(_)) "";
        };

        // Extract temperature from main.temp
        let temp = switch (Json.getAsObject(parsed, "main")) {
          case (#ok(mainObj)) {
            // mainObj is [(Text, Json)], need to find temp field
            var tempValue : Float = 0.0;
            for ((key, value) in mainObj.vals()) {
              if (key == "temp") {
                switch (value) {
                  case (#number(#float(f))) { tempValue := f };
                  case (#number(#int(i))) { tempValue := Float.fromInt(i) };
                  case (_) {};
                };
              };
            };
            tempValue;
          };
          case (#err(_)) 0.0;
        };

        // Extract feels_like from main.feels_like
        let feels_like = switch (Json.getAsObject(parsed, "main")) {
          case (#ok(mainObj)) {
            var feelsValue : Float = 0.0;
            for ((key, value) in mainObj.vals()) {
              if (key == "feels_like") {
                switch (value) {
                  case (#number(#float(f))) { feelsValue := f };
                  case (#number(#int(i))) { feelsValue := Float.fromInt(i) };
                  case (_) {};
                };
              };
            };
            feelsValue;
          };
          case (#err(_)) 0.0;
        };

        // Extract visibility
        let visibility : Nat = switch (Json.getAsInt(parsed, "visibility")) {
          case (#ok(visValue)) Int.abs(visValue);
          case (#err(_)) 0;
        };

        // Extract wind speed from wind.speed
        let wind_speed = switch (Json.getAsObject(parsed, "wind")) {
          case (#ok(windObj)) {
            var speedValue : Float = 0.0;
            for ((key, value) in windObj.vals()) {
              if (key == "speed") {
                switch (value) {
                  case (#number(#float(f))) { speedValue := f };
                  case (#number(#int(i))) { speedValue := Float.fromInt(i) };
                  case (_) {};
                };
              };
            };
            speedValue;
          };
          case (#err(_)) 0.0;
        };

        // Extract city name
        let city_name = switch (Json.getAsText(parsed, "name")) {
          case (#ok(nameValue)) nameValue;
          case (#err(_)) "";
        };

        {
          description = description;
          temp = temp;
          feels_like = feels_like;
          visibility = visibility;
          wind_speed = wind_speed;
          city_name = city_name;
        };
      };
      case (#err(_)) {
        // Return default values if JSON parsing fails
        {
          description = "";
          temp = 0.0;
          feels_like = 0.0;
          visibility = 0;
          wind_speed = 0.0;
          city_name = "";
        };
      };
    };
  };
};
