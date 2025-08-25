# -====================================== IMPORT =======================================
from typing import List
import json
from webbrowser import get

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
    name="AirQualityAgent",
    description="Agentic AI for air quality-related tasks",
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

def __get_lat_long_from_city_name(city_name: str) -> Async[ReturnType]:

    # Build the API URL
    base_url = "https://api.openweathermap.org/geo/1.0/direct"
    
    # Parameters
    params = {
        "q": city_name,
        "appid": '2b11c2a05b23b49985529c06d7c96b24',
        "limit": "1"
    }
    
    # Construct full URL
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    full_url = f"{base_url}?{query_string}"

    request_args = {
        "url": full_url,
        "max_response_bytes": 4096,
        "headers": [],
        "body": None,
        "method": {"get": None},
        "transform": None
    }

    ic.print(request_args)
    
    # Add cycles for the outcall

    http_result: CallResult[HttpResponse] = yield management_canister \
        .http_request(request_args) \
        .with_cycles(50_000_000)
    
    response = match(
        http_result,
        {
            "Ok": lambda ok: { 
                # "Ok":  json.dumps(
                #     {
                #         "lat": json.loads( ok["body"].decode("utf-8") )['lat'],
                #         "lon": json.loads( ok["body"].decode("utf-8") )['lon'],
                #         "country": json.loads( ok["body"].decode("utf-8") )['country']
                #     }
                # )
                'Ok': ok["body"].decode("utf-8")
            },
            "Err": lambda err: { "Err": str(err) }
        },
    )

    ic.print(response.get("Ok"))
    ic.print(type(response.get("Ok")))

    if response.get("Err") is not None:
        ic.print( f"[AirQualityAgent] Error fetching city coordinates - {response.get('Err')}")

    return response

def __tool__get_air_quality(city_name: str) -> Async[ReturnType]:

    city_coordinates_stream = yield __get_lat_long_from_city_name(city_name)

    if city_coordinates_stream.get("Err") is not None:
        return city_coordinates_stream

    ic.print(city_coordinates_stream)

    city_coordinates = json.loads(city_coordinates_stream.get("Ok"))

    ic.print(city_coordinates)

    # Build the API URL
    base_url = "https://api.openweathermap.org/data/2.5/air_pollution"
    
    # Parameters
    params = {
        "lat": city_coordinates['lat'],
        "lon": city_coordinates['lon'],
        "appid": '2b11c2a05b23b49985529c06d7c96b24'
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
            # "Ok": lambda ok: { 
            #     "Ok":  json.dumps(
            #         json.loads(ok["body"].decode("utf-8") )['weather']
            #     )
            # },
            "Ok": lambda ok: { "Ok": ok["body"].decode("utf-8") },
            "Err": lambda err: { "Err": str(err) }
        },
    )

    if response.get("Err") is not None:
        ic.print( f"[AirQualityAgent] Error fetching air quality data - {response.get('Err')}")

    return response

__TOOLS = {
    "get_air_quality": {
        "func" : __tool__get_air_quality,
        "metadata" : create_function_tool(
            name="get_air_quality",
            description="a function tool to get current air quality",
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

    ic.print(f"[AirQualityAgent] Parse Params - {prompt}")

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
    
    ic.print(f"[AirQualityAgent] Result Refinement - {results}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message("You are a helpful agent. Provide accurate air quality info in one paragraph."),
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

        ic.print(f"[AirQualityAgent] Tool Name - {tool_name} - {tool_args}")

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
    Example args : `[{"name": "prompt", "value": "How is the air quality in Jakarta ?"}]`
    """

    ic.print(f"[AirQualityAgent] Execute Task - {args}")

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