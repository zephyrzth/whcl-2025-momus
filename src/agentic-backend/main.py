# llm_interface_fixed.py - Working version for Kybra
from kybra import (
    Service, service_update, Principal, Opt, 
    Async, update, query, match, text, Record, Vec, Variant
)
import json

# ===== Service Interface with Simple Types =====
# Use basic types in Service interface to avoid compilation errors

class ChatV0RequestMessage(Record):
    content: text
    role: text

class ChatV0Request(Record):
    model: text
    messages: Vec[ChatV0RequestMessage]

class LLMServiceInterface(Service):

    @service_update
    def v0_chat(self, request: ChatV0Request) -> str:
        pass
    
    @service_update
    def v1_chat(self, request: ChatV0Request) -> str:
        pass

# ===== Constants and Storage =====

LLM_CANISTER_ID = "w36hm-eqaaa-aaaal-qr76a-cai"  # Replace with actual ID
conversations_v0 = {}
conversations_v1 = {}

# ===== Helper Functions for Message Creation =====

def create_user_message_v0(content: str):
    """Create a v0 user message"""
    return {
        "content": content,
        "role": {"user": None}
    }

def create_system_message_v0(content: str):
    """Create a v0 system message"""
    return {
        "content": content,
        "role": {"system": None}
    }

def create_assistant_message_v0(content: str):
    """Create a v0 assistant message"""
    return {
        "content": content,
        "role": {"assistant": None}
    }

def create_user_message_v1(content: str):
    """Create a v1 user message"""
    return {
        "user": {"content": content}
    }

def create_system_message_v1(content: str):
    """Create a v1 system message"""
    return {
        "system": {"content": content}
    }

def create_assistant_message_v1(content: str, tool_calls=None):
    """Create a v1 assistant message"""
    return {
        "assistant": {
            "content": content,
            "tool_calls": tool_calls or []
        }
    }

def create_tool_message_v1(content: str, tool_call_id: str):
    """Create a v1 tool message"""
    return {
        "tool": {
            "content": content,
            "tool_call_id": tool_call_id
        }
    }

def create_function_tool(name: str, description: str = None, parameters: dict = None):
    """Create a function tool"""
    tool_def = {
        "function": {
            "name": name,
            "description": description,
            "parameters": None
        }
    }
    
    if parameters:
        tool_def["function"]["parameters"] = {
            "type": parameters.get("type", "object"),
            "properties": parameters.get("properties"),
            "required": parameters.get("required")
        }
    
    return tool_def

# ===== Canister Endpoints =====

@update
def chat_v0_simple(model: str, user_input: str) -> Async[str]:
    """Simple v0 chat interface using JSON serialization"""
    try:
        # Create service instance
        llm_service = LLMServiceInterface(Principal.from_str(LLM_CANISTER_ID))
        
        # Create request as dictionary
        messages = [
            create_system_message_v0("You are a helpful assistant."),
            create_user_message_v0(user_input)
        ]
        
        request = {
            "model": model,
            "messages": messages
        }
        
        # Serialize to JSON string
        # request_json = json.dumps(request)
        
        # Call v0_chat with JSON string
        response = yield llm_service.v0_chat(request)
        
        return match(response, {"Ok": lambda ok: ok, "Err": lambda err: err})
        
    except Exception as e:
        return json.dumps({"error": str(e)})

@update
def chat_v1_simple(model: str, user_input: str) -> str:
    """Simple v1 chat interface"""
    try:
        # Create service instance
        llm_service = LLMServiceInterface(Principal.from_str(LLM_CANISTER_ID))
        
        # Create messages
        messages = [
            create_system_message_v1("You are a helpful assistant."),
            create_user_message_v1(user_input)
        ]
        
        # Create request
        request = {
            "model": model,
            "messages": messages,
            "tools": None
        }
        
        # Serialize to JSON
        request_json = json.dumps(request)
        
        # Call v1_chat
        response_json = llm_service.v1_chat(request_json)
        
        # Parse response
        response = json.loads(response_json)
        
        if "message" in response:
            message = response["message"]
            content = message.get("content", "")
            return json.dumps({
                "success": True,
                "content": content
            })
        
        return json.dumps({"error": "Invalid response"})
        
    except Exception as e:
        return json.dumps({"error": str(e)})

@update
def chat_v1_with_tools(model: str, user_input: str) -> str:
    """v1 chat with tools support"""
    try:
        llm_service = LLMServiceInterface(Principal.from_str(LLM_CANISTER_ID))
        
        # Create messages
        messages = [
            create_system_message_v1("You are a helpful assistant with access to tools."),
            create_user_message_v1(user_input)
        ]
        
        # Create tools
        tools = [
            create_function_tool(
                name="get_weather",
                description="Get current weather for a location",
                parameters={
                    "type": "object",
                    "properties": [
                        {
                            "name": "location",
                            "type": "string",
                            "description": "City name",
                            "enum": None
                        }
                    ],
                    "required": ["location"]
                }
            )
        ]
        
        # Create request with tools
        request = {
            "model": model,
            "messages": messages,
            "tools": tools
        }
        
        request_json = json.dumps(request)
        response_json = llm_service.v1_chat(request_json)
        
        response = json.loads(response_json)
        
        if "message" in response:
            message = response["message"]
            content = message.get("content", "")
            tool_calls = message.get("tool_calls", [])
            
            return json.dumps({
                "success": True,
                "content": content,
                "tool_calls": tool_calls
            })
        
        return json.dumps({"error": "Invalid response"})
        
    except Exception as e:
        return json.dumps({"error": str(e)})

@update
def chat_with_history(session_id: str, user_input: str, version: str = "v1") -> str:
    """Chat with conversation history (supports both v0 and v1)"""
    try:
        llm_service = LLMServiceInterface(Principal.from_str(LLM_CANISTER_ID))
        
        if version == "v0":
            # V0 conversation
            if session_id not in conversations_v0:
                conversations_v0[session_id] = [
                    create_system_message_v0("You are a helpful assistant.")
                ]
            
            conversations_v0[session_id].append(create_user_message_v0(user_input))
            
            request = {
                "model": "llama3.1:8b",
                "messages": conversations_v0[session_id]
            }
            
            response_text = llm_service.v0_chat(json.dumps(request))
            
            # Add response to history
            conversations_v0[session_id].append(create_assistant_message_v0(response_text))
            
            return json.dumps({
                "success": True,
                "response": response_text,
                "version": "v0"
            })
            
        else:
            # V1 conversation
            if session_id not in conversations_v1:
                conversations_v1[session_id] = [
                    create_system_message_v1("You are a helpful assistant.")
                ]
            
            conversations_v1[session_id].append(create_user_message_v1(user_input))
            
            request = {
                "model": "llama3.1:8b",
                "messages": conversations_v1[session_id],
                "tools": None
            }
            
            response_json = llm_service.v1_chat(json.dumps(request))
            response = json.loads(response_json)
            
            if "message" in response:
                message = response["message"]
                content = message.get("content", "")
                tool_calls = message.get("tool_calls", [])
                
                conversations_v1[session_id].append(
                    create_assistant_message_v1(content, tool_calls)
                )
                
                # Limit history
                if len(conversations_v1[session_id]) > 20:
                    conversations_v1[session_id] = [conversations_v1[session_id][0]] + conversations_v1[session_id][-19:]
                
                return json.dumps({
                    "success": True,
                    "response": content,
                    "version": "v1",
                    "has_tool_calls": len(tool_calls) > 0
                })
            
            return json.dumps({"error": "Invalid response"})
            
    except Exception as e:
        return json.dumps({"error": str(e)})

@update
def handle_tool_response(session_id: str, tool_call_id: str, tool_result: str) -> str:
    """Handle tool call results"""
    try:
        if session_id not in conversations_v1:
            return json.dumps({"error": "Session not found"})
        
        # Add tool result
        conversations_v1[session_id].append(
            create_tool_message_v1(tool_result, tool_call_id)
        )
        
        # Continue conversation
        llm_service = LLMServiceInterface(Principal.from_str(LLM_CANISTER_ID))
        
        request = {
            "model": "llama3.1:8b",
            "messages": conversations_v1[session_id],
            "tools": None
        }
        
        response_json = llm_service.v1_chat(json.dumps(request))
        response = json.loads(response_json)
        
        if "message" in response:
            content = response["message"].get("content", "")
            
            conversations_v1[session_id].append(
                create_assistant_message_v1(content)
            )
            
            return json.dumps({
                "success": True,
                "response": content
            })
        
        return json.dumps({"error": "Invalid response"})
        
    except Exception as e:
        return json.dumps({"error": str(e)})

# ===== Query Methods =====

@query
def get_session_history(session_id: str, version: str = "v1") -> str:
    """Get conversation history for a session"""
    if version == "v0" and session_id in conversations_v0:
        return json.dumps(conversations_v0[session_id])
    elif version == "v1" and session_id in conversations_v1:
        return json.dumps(conversations_v1[session_id])
    return json.dumps([])

@query
def list_all_sessions() -> str:
    """List all active sessions"""
    return json.dumps({
        "v0_sessions": list(conversations_v0.keys()),
        "v1_sessions": list(conversations_v1.keys())
    })

@query
def clear_session(session_id: str) -> str:
    """Clear a session from both v0 and v1"""
    cleared = []
    if session_id in conversations_v0:
        del conversations_v0[session_id]
        cleared.append("v0")
    if session_id in conversations_v1:
        del conversations_v1[session_id]
        cleared.append("v1")
    
    return json.dumps({
        "success": len(cleared) > 0,
        "cleared_from": cleared
    })
