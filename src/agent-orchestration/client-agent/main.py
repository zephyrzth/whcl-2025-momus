from kybra import (
    Service, service_update, Principal, Async,
    Record, Variant, Vec, Opt, update, query, match, ic
)

from llm import *
from typing import List, Optional
import json

from model import *


__METADATA = create_function_tool(
    name="client_agent",
    description="Calling Agentic AI for planning and routing to other agent",
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
        
        tools = None

        # Create request using ChatRequestV1 type
        request = {
            "model": "llama3.1:8b",
            "tools": tools,
            "messages": messages
        }
        
        # Call service
        response_raw = yield llm_service.v1_chat(request)

        response = match(response_raw, {"Ok": lambda ok: ok, "Err": lambda err: err})

        ic.print(response)
        
        # Process response
        if response and "message" in response:
            message = response["message"]
            return json.dumps({
                "content": message.get("content"),
                "tool_calls": message.get("tool_calls", [])
            })
        
        return json.dumps({"response": str(response)})
        
    except Exception as e:
        return json.dumps({"error": str(e)})
