# -====================================== IMPORT =======================================
from kybra import (
    Principal, Async, update, query, match, ic
)

from llm import *
from typing import List, Optional
import json

from model import *
from metadata import *
from constants import *
# -====================================== IMPORT =======================================

# ===================================== ROUTER MAIN ====================================

@query
def get_owner() -> Principal:
    return ic.id()

@query
def get_price() -> int:
    return 1_000_000

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
    Example args : `[{"name":"prompt","value":"How was the weather and air quality today in Jakarta ?"},{"name":"connected_agent_list","value":["weather-agent","airquality-agent"]}]`
    """

    try:
        params: List[dict] = json.loads(args)

        if not is_all_required_params_present(params):
            return { "Err": "Missing required parameters" }

        parameters = __transform_params(params)

        agent_call_list_stream = yield __parse_parameter(parameters)
        agent_call_list_raw = match( agent_call_list_stream, { "Ok": lambda ok: { "Ok": ok }, "Err": lambda err: { "Err": err } })

        if agent_call_list_raw.get("Err") is not None:
            ic.print(f"[ClientAgent] Error parsing agent call list: {agent_call_list_raw.get('Err')}")
            return { "Err": "Failed to parse agent call list" }

        agent_call_list = json.loads(agent_call_list_raw.get("Ok"))

        ic.print(agent_call_list)

        resp = ""

        for agent in agent_call_list:
            curr_stream_resp = yield __agent_call(agent['function']["name"], agent['function']["arguments"]) 
            curr_stream_raw = match( curr_stream_resp, { "Ok": lambda ok: { "Ok": ok }, "Err": lambda err: { "Err": err } })
            
            if curr_stream_raw.get("Err") is not None:
                ic.print(f"[ClientAgent] Error calling agent '{agent['function']['name']}': {curr_stream_raw.get('Err')}")
                return { "Err": f"Failed to call agent '{agent['function']['name']}'" }

            curr_stream = curr_stream_raw.get("Ok")
            
            # for testing
            curr_stream = curr_stream.split(".")[0]

            curr_resp = f"`{agent['function']['name']}`: {curr_stream}\n"
            resp += curr_resp

        resp = yield __result_refinement(resp)

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

def __get_agent_metadata(agent_name: str) -> Async[dict]:

    agent_registry = AgentRegistryInterface(Principal.from_str(AGENT_REGISTRY_CANISTER_ID))
    resp_stream = yield agent_registry.get_agent_by_name(agent_name)
    resp = match( resp_stream, { "Ok": lambda ok: ok, "Err": lambda err: { "Err": err } })

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None
    
    agent_mapper = json.loads(resp.get("Ok"))

    agent = AgentInterface(Principal.from_str(agent_mapper.get("canister_id")))
    resp_stream = yield agent.get_metadata()

    resp = match( resp_stream, { "Ok": lambda ok: ok, "Err": lambda err: { "Err": err } })

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None
    
    agent_metadata = json.loads(resp.get("Ok"))

    for i in range(len(agent_metadata['function']['parameters']['properties'])):
        if agent_metadata['function']['parameters']['properties'][i]['name'] == 'connected_agent_list':
            agent_metadata['function']['parameters']['properties'].pop(i)

    return agent_metadata

def __parse_parameter(parameters: dict) -> Async[dict]:
        
    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    tools = []

    for agent_name in parameters.get("connected_agent_list", []):
        agent_metadata = yield __get_agent_metadata(agent_name)
        if agent_metadata is None:
            return { "Err": f"Agent '{agent_name}' not found" }
        tools.append(agent_metadata)
    
    tools = tools if len(tools) > 0 else None

    # Create messages
    messages = [
        create_system_message("You are a helpful assistant."),
        create_user_message(parameters.get("prompt"))
    ]

    # Create request using ChatRequestV1 type
    request = {
        "model": "llama3.1:8b",
        "tools": tools,
        "messages": messages
    }
    
    # Call service
    response_steam = yield llm_service.v1_chat(request)
    
    response_raw = match(
        response_steam, 
        {
            "Ok": lambda ok: { "Ok": ok }, 
            "Err": lambda err: { "Err": err }
        }
    )

    if response_raw.get("Err") is not None:
        return response_raw
    
    response = response_raw.get("Ok")
    list_agent_call = response.get('message', {}).get('tool_calls', [])

    return { "Ok": json.dumps(list_agent_call) }

def __agent_call( agent_name: str, parameters: List[dict] ) -> Async[dict]:

    agent_registry = AgentRegistryInterface(Principal.from_str(AGENT_REGISTRY_CANISTER_ID))
    resp_stream = yield agent_registry.get_agent_by_name(agent_name)
    resp = match( resp_stream, { "Ok": lambda ok: ok, "Err": lambda err: { "Err": err } })

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None
    
    agent_mapper = json.loads(resp.get("Ok"))

    agent = AgentInterface(Principal.from_str(agent_mapper.get("canister_id")))
    resp_stream = yield agent.execute_task(json.dumps(parameters))

    resp = match( resp_stream, { "Ok": lambda ok: ok, "Err": lambda err: { "Err": err } })

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None

    agent_response = resp.get("Ok")

    ic.print(f"[ClientAgent] Agent '{agent_name}' response: {agent_response}")

    return { "Ok": agent_response }


def __result_refinement(results: str) -> Async[ReturnType]:
    
    ic.print(f"[ClientAgent] Result Refinement - {results}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message("You are a helpful agent. Combine the response into one paragraph."),
        create_user_message(results)
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
# ===================================== HELPER FUNC ====================================