# -====================================== IMPORT =======================================
from typing import List
import json

from kybra import (
    Service, 
    service_update, 
    Principal, 
    Async, 
    update, 
    query, 
    match, 
    ic, 
    CallResult
)

from kybra.canisters.management import (
    HttpResponse,
    management_canister
)

from llm import *
from model import *
# -====================================== IMPORT =======================================

# ====================================== METADATA ======================================

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

# ====================================== METADATA ======================================

# ===================================== TOOLS FUNC =====================================

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

    http_result: CallResult[HttpResponse] = yield management_canister \
        .http_request(request_args) \
        .with_cycles(50_000_000)

    response = match(
        http_result,
        {
            # for testing using smaller data
            "Ok": lambda ok: { 
                "Ok":  json.dumps(
                    json.loads(ok["body"].decode("utf-8") )['weather']
                )
            },
            # "Ok": lambda ok: { "Ok": ok["body"].decode("utf-8") },
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

# ===================================== TOOLS FUNC =====================================

# ===================================== HELPER FUNC ====================================

def __transform_params(params: List[dict]) -> dict:
    return { p["name"]: p["value"] for p in params if p.get("value") is not None }

def __parse_params(prompt: str) -> Async[ReturnType]:

    ic.print(f"[ClientAgent] Parse Params - {prompt}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message("You are a helpful assistant."),
        create_user_message(prompt)
    ]
    
    tools = __get_tool_list()

    request = {
        "model": "llama3.1:8b",
        "tools": tools,
        "messages": messages
    }
    
    # Call service
    response_stream = yield llm_service.v1_chat(request)

    response = match(
        response_stream,
        {
            "Ok": lambda ok: { "Ok": ok }, 
            "Err": lambda err: { "Err": err }
        }
    )

    return response

def __result_refinement(results: str) -> Async[ReturnType]:
    
    ic.print(f"[ClientAgent] Result Refinement - {results}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message("You are a helpful agent. Provide accurate weather info in sentences"),
        create_user_message(f"Weather Data : {results}")
    ]

    request = {
        "model": "llama3.1:8b",
        "tools": None,
        "messages": messages
    }
    
    # Call service
    response_stream = yield llm_service.v1_chat(request)

    response = match(
        response_stream,
        {
            "Ok": lambda ok: { "Ok": ok }, 
            "Err": lambda err: { "Err": err }
        }
    )

    return response

def __call_tools(tool_calls: List[dict]) -> Async[list]:
    
    tool_results = []

    for tool_desc in tool_calls:
        tool = tool_desc.get("function", {})
        tool_name = tool.get("name")
        tool_args_list = tool.get("arguments", [])
        tool_args = __transform_params(tool_args_list)

        ic.print(f"[ClientAgent] Tool Name - {tool_name} - {tool_args}")

        if tool_name in __TOOLS:

            tool_response = yield __TOOLS[tool_name]["func"](**tool_args)
            
            if tool_response.get("Err") is not None:
                return tool_response

            tool_results.append(tool_response.get("Ok"))

    return tool_results

# ===================================== HELPER FUNC ====================================

# ===================================== ROUTER MAIN ====================================

@query
def get_metadata() -> ReturnType:
    """
    Get metadata for the Agent.
    """
    return { "Ok": json.dumps(__METADATA) }

@update
def execute_task(args: str) -> Async[ReturnType]:
    """
    Execute a agentic task.
    Example args : `[{"name": "prompt", "value": "How is the weather in Jakarta ?"}]`
    """

    ic.print(f"[ClientAgent] Execute Task - {args}")

    try:
        # Create service instance
        params: List[dict] = json.loads(args)
        if not __is_all_required_params_present(params):
            return { "Err": "Missing required parameters" }

        parameters = __transform_params(params)
        resp = yield __parse_params(parameters.get("prompt"))

        if resp.get("Err") is not None:
            return resp

        parsed_params = resp.get("Ok")
        tool_results = yield __call_tools(parsed_params.get('message', {}).get("tool_calls", []))
        compiled_result = '.'.join( tool_results )

        resp = yield __result_refinement(compiled_result)

        if resp.get("Err") is not None:
            return resp
        
        final_result = resp.get("Ok").get('message', {}).get('content', '')

        return { "Ok": final_result }

    except Exception as e:
        return { "Err": json.dumps({"error": str(e)}) }

# ===================================== ROUTER MAIN ====================================