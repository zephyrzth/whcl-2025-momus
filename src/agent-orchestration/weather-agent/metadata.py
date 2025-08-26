from typing import List

from llm import create_function_tool

# ====================================== METADATA ======================================

METADATA = create_function_tool(
    name="weather-agent",
    description="Agentic AI for weather-related tasks",
    params={
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Refined user prompt for weather related task"
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

# ====================================== METADATA ======================================