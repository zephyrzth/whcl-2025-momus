from kybra import (
    Service, service_update, Principal, Async,
    Record, Variant, Vec, Opt, update, query, match, ic
)

from llm import *
from typing import List, Optional
import json

storage_name = []

@update
def greeting_name(name: str) -> str:
    ic.print(f"Greeting {name}")
    storage_name.append(name)
    return f"Hello, {name}!"

@update
def call_llm_v1(user_input: str, use_tools: bool = False) -> Async[str]:
    """Call LLM using the class-based types"""
    try:
        # Create service instance
        llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))
        
        # Create messages
        messages = [
            create_system_message("You are a helpful assistant."),
            create_user_message(user_input)
        ]
        
        # Create tools if requested
        tools = None

        if use_tools:
            tools = [
                create_function_tool(
                    name="call__weather_agent",
                    description="Calling Agentic AI for get and analyzing the weather data",
                    params={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "refined query that contains relevant information to get weather data"
                            }
                        },
                        "required": ["prompt"]
                    }
                ),
                create_function_tool(
                    name="call__air_quality_agent",
                    description="Calling Agentic AI for get and analyzing the air quality data",
                    params={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "refined query that contains relevant information to get air quality data"
                            }
                        },
                        "required": ["prompt"]
                    }
                )
            ]
        
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
