from typing import List
from llm import create_function_tool

METADATA = create_function_tool(
    name="client-agent",
    description="Agentic AI for planning and routing to other agent",
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

def is_all_required_params_present(params: List[dict]) -> bool:

    for param in METADATA['function']['parameters']['required'] or []:
        if not any(p.get("name") == param for p in params):
            return False
        
    return True
