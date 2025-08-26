from kybra import (
    update, query, Async, ic,
    StableBTreeMap, blob
)

from typing import List, Optional
import json

from model import *

# Storage for chunks and deployments
agent_registry = StableBTreeMap[str, AgentMetadata](
    memory_id=1, max_key_size=128, max_value_size=2_000_000  # ~2MB chunks
)

@update
def register_agent(agent_name: str, canister_id: str) -> ReturnType:
    agent_registry.insert(agent_name, AgentMetadata(agent_name=agent_name, canister_id=canister_id))
    return { "Ok": f"Agent {agent_name} registered successfully" }

@query
def get_agent_by_name(agent_name: str) -> ReturnType:

    agent = agent_registry.get(agent_name)

    if agent is None:
        return { "Err": f"Agent {agent_name} not found" }
    
    return { "Ok": json.dumps(agent) }

@query
def get_list_agents() -> ReturnType:
    agents = agent_registry.values()
    data = [ agent for agent in agents ]
    return { "Ok": json.dumps(data) }