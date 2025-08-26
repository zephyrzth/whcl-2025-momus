from typing import List

from llm import create_function_tool
from tools_get_air_quality import tool__get_air_quality

TOOLS = {
    "get_air_quality": {
        "func" : tool__get_air_quality,
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

def get_tool_list() -> List[str]:
    return [ tool['metadata'] for tool in TOOLS.values() ]