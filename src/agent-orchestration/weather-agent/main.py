# -====================================== IMPORT =======================================
from typing import List
import json

from kybra import (
    Principal, 
    Async, 
    update, 
    query, 
    match, 
    ic
)

from llm import *
from model import *
from metadata import *
from tools_metadata import *
from constants import *
# -====================================== IMPORT =======================================

# ===================================== ROUTER MAIN ====================================

@query
def get_metadata() -> ReturnType:
    """
    Get metadata for the Agent.
    """
    return { "Ok": json.dumps(METADATA) }

@update
def execute_task(args: str) -> Async[ReturnType]:
    """
    Execute a agentic task.
    Example args : `[{"name": "prompt", "value": "How is the weather in Jakarta ?"}]`
    """

    ic.print(f"[WeatherAgent] Execute Task - {args}")

    try:
        # Create service instance
        params: List[dict] = json.loads(args)
        if not is_all_required_params_present(params):
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


# ===================================== HELPER FUNC ====================================

def __transform_params(params: List[dict]) -> dict:
    return { p["name"]: p["value"] for p in params if p.get("value") is not None }

def __parse_params(prompt: str) -> Async[ReturnType]:

    ic.print(f"[WeatherAgent] Parse Params - {prompt}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message("You are a helpful assistant."),
        create_user_message(prompt)
    ]
    
    tools = get_tool_list()

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
    
    ic.print(f"[WeatherAgent] Result Refinement - {results}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message("You are a helpful agent. Provide accurate weather info in one paragraph."),
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

        ic.print(f"[WeatherAgent] Tool Name - {tool_name} - {tool_args}")

        if tool_name in TOOLS:

            tool_response = yield TOOLS[tool_name]["func"](**tool_args)
            
            if tool_response.get("Err") is not None:
                return tool_response

            tool_results.append(tool_response.get("Ok"))

    return tool_results

# ===================================== HELPER FUNC ====================================
