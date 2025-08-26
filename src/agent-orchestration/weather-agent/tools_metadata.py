
from typing import List
from llm import create_function_tool
from tools_get_weather import tool__get_weather

TOOLS = {
    "get_weather": {
        "func" : tool__get_weather,
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

def get_tool_list() -> List[str]:
    return [ tool['metadata'] for tool in TOOLS.values() ]
