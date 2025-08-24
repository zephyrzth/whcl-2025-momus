
from kybra import (
    Service, service_update, Principal, Async,
    Record, Variant, Vec, Opt, update, query, match, ic, null, CallResult
)

from kybra.canisters.management import (
    HttpResponse,
    HttpTransformArgs,
    management_canister
)

from llm import *
from typing import List, Optional
import json

from model import *

__METADATA = create_function_tool(
    name="WeatherAgent",
    description="Agentic AI for weather-related tasks",
    params={
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "User input prompt"
            },
            "connected_agent_list": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "List of connected agent names available for use"
            },
        },
        "required": ["prompt"]
    }
)

def __is_all_required_params_present(params: List[dict]) -> bool:

    for param in __METADATA['function']['parameters']['required'] or []:
        if not any(p.get("name") == param for p in params):
            return False
        
    return True

def __transform_params(params: List[dict]) -> dict:
    return { p["name"]: p["value"] for p in params if p.get("value") is not None }

def __tool__get_weather(city_name: str) -> Async[ReturnType]:


    # Build the API URL
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    
    # Parameters
    params = {
        "q": city_name,
        "appid": '2b11c2a05b23b49985529c06d7c96b24',
        "units": "metric"
    }
    
    # Construct full URL
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    full_url = f"{base_url}?{query_string}"
    
    request_args = {
        "url": full_url,
        "max_response_bytes": 2048,
        "headers": [],
        "body": None,
        "method": {"get": None},
        "transform": None
    }
    
    # Add cycles for the outcall

    http_result: CallResult[HttpResponse] = yield management_canister.http_request(request_args).with_cycles(50_000_000)

    response = match(
        http_result,
        {
            "Ok": lambda ok: { "Ok": ok["body"].decode("utf-8") },
            "Err": lambda err: { "Err": str(err) }
        },
    )

    return response

__TOOLS = {
    "get_weather": {
        "func" : __tool__get_weather,
        "metadata" : create_function_tool(
            name="get_weather",
            description="a function tool to get current weather",
            params={
                "type": "object",
                "properties": {
                    "city_name": {
                        "type": "string",
                        "description": "name of city"
                    }
                },
                "required": ["city_name"]
            }
        )
    }
}

def __get_tool_list() -> List[str]:
    return [ tool['metadata'] for tool in __TOOLS.values() ]

@query
def get_metadata() -> ReturnType:
    return { "Ok": json.dumps(__METADATA) }

@update
def execute_task(args: str) -> Async[ReturnType]:

    ic.print(f"[ClientAgent] Execute Task - {args}")

    try:
        # Create service instance
        llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

        params: List[dict] = json.loads(args)
        if not __is_all_required_params_present(params):
            return { "Err": "Missing required parameters" }

        parameters = __transform_params(params)
        
        # Create messages
        messages = [
            create_system_message("You are a helpful assistant."),
            create_user_message(parameters.get("prompt"))
        ]
        
        tools = __get_tool_list()

        ic.print(tools)

        # Create request using ChatRequestV1 type
        request = {
            "model": "llama3.1:8b",
            "tools": tools,
            "messages": messages
        }
        
        # Call service
        response_steam = yield llm_service.v1_chat(request)
        
        response_raw = match(
            response_steam, 
            {
                "Ok": lambda ok: { "Ok": ok }, 
                "Err": lambda err: { "Err": err }
            }
        )

        if response_raw.get("Err") is not None:
            return response_raw
        
        response = response_raw.get("Ok")
    
        ic.print(response)
        
        # # Process response
        # if response and "message" in response:
        #     message = response["message"]
        #     return json.dumps({
        #         "content": message.get("content"),
        #         "tool_calls": message.get("tool_calls", [])
        #     })

        return { "Ok": json.dumps(response) }

    except Exception as e:
        return { "Err": json.dumps({"error": str(e)}) }
