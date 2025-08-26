# llm_v1_interface.py - Exact match for the provided Candid
from kybra import (
    Service, service_update,
    Record, Variant, Vec, Opt
)

from typing import Optional, List
# ===== Tool-related types =====

class ToolArgument(Record):
    value: str
    name: str

class ToolFunction(Record):
    name: str
    arguments: Vec[ToolArgument]

class ToolCall(Record):
    id: str
    function: ToolFunction

# ===== Property for tool parameters =====

class Property(Record):
    enum: Opt[Vec[str]]
    name: str
    type: str
    description: Opt[str]

# ===== Parameters for tools =====

class Parameters(Record):
    type: str
    properties: Opt[Vec[Property]]
    required: Opt[Vec[str]]

# ===== Tool variant =====

class FunctionTool(Record):
    name: str
    parameters: Opt[Parameters]
    description: Opt[str]

class Tool(Variant):
    function: FunctionTool

# ===== Message types =====

class ToolMessage(Record):
    content: str
    tool_call_id: str

class UserMessage(Record):
    content: str

class AssistantMessage(Record):
    content: Opt[str]
    tool_calls: Vec[ToolCall]

class SystemMessage(Record):
    content: str

class Message(Variant):
    tool: ToolMessage
    user: UserMessage
    assistant: AssistantMessage
    system: SystemMessage

# ===== Request and Response types =====

class ChatRequestV1(Record):
    model: str
    tools: Opt[Vec[Tool]]
    messages: Vec[Message]

class MessageResponse(Record):
    content: Opt[str]
    tool_calls: Vec[ToolCall]

class ChatResponseV1(Record):
    message: MessageResponse

# ===== Service Interface =====

from kybra import Service, service_update, Async

class LLMServiceV1(Service):
    @service_update
    def v1_chat(self, request: ChatRequestV1) -> ChatResponseV1:
        pass

# Constants
LLM_CANISTER_ID = "w36hm-eqaaa-aaaal-qr76a-cai"

# llm_helpers_classes.py - Helper functions for the class-based types

# Helper functions to create messages
def create_user_message(content: str) -> dict:
    """Create a user message variant"""
    return {"user": {"content": content}}

def create_system_message(content: str) -> dict:
    """Create a system message variant"""
    return {"system": {"content": content}}

def create_assistant_message(content: Optional[str] = None, tool_calls: List = None) -> dict:
    """Create an assistant message variant"""
    return {
        "assistant": {
            "content": content,
            "tool_calls": tool_calls or []
        }
    }

def create_tool_message(content: str, tool_call_id: str) -> dict:
    """Create a tool message variant"""
    return {
        "tool": {
            "content": content,
            "tool_call_id": tool_call_id
        }
    }

def create_function_tool(name: str, description: str = None, params: dict = None) -> dict:
    """Create a function tool variant"""
    tool = {
        "function": {
            "name": name,
            "description": description,
            "parameters": None
        }
    }
    
    if params:
        properties = []
        for prop_name, prop_def in params.get("properties", {}).items():
            properties.append({
                "name": prop_name,
                "type": prop_def.get("type", "string"),
                "description": prop_def.get("description"),
                "enum": prop_def.get("enum")
            })
        
        if properties:
            tool["function"]["parameters"] = {
                "type": params.get("type", "object"),
                "properties": properties,
                "required": params.get("required")
            }
    
    return tool

# llm_helpers_classes.py - Helper functions for the class-based types

# Helper functions to create messages
def create_user_message(content: str) -> dict:
    """Create a user message variant"""
    return {"user": {"content": content}}

def create_system_message(content: str) -> dict:
    """Create a system message variant"""
    return {"system": {"content": content}}

def create_assistant_message(content: Optional[str] = None, tool_calls: List = None) -> dict:
    """Create an assistant message variant"""
    return {
        "assistant": {
            "content": content,
            "tool_calls": tool_calls or []
        }
    }

def create_tool_message(content: str, tool_call_id: str) -> dict:
    """Create a tool message variant"""
    return {
        "tool": {
            "content": content,
            "tool_call_id": tool_call_id
        }
    }

def create_function_tool(name: str, description: str = None, params: dict = None) -> dict:
    """Create a function tool variant"""
    tool = {
        "function": {
            "name": name,
            "description": description,
            "parameters": None
        }
    }
    
    if params:
        properties = []
        for prop_name, prop_def in params.get("properties", {}).items():
            properties.append({
                "name": prop_name,
                "type": prop_def.get("type", "string"),
                "description": prop_def.get("description"),
                "enum": prop_def.get("enum")
            })
        
        if properties:
            tool["function"]["parameters"] = {
                "type": params.get("type", "object"),
                "properties": properties,
                "required": params.get("required")
            }
    
    return tool
