
from kybra import (
    Service, service_update, service_query, Record, Opt, text, Variant
)

from typing import List, Optional

class ReturnType(Variant, total=False):
    Ok: Opt[str]
    Err: Opt[str]

# Management Canister Service
class AgentInterface(Service):
    @service_query
    def get_metadata(self) -> ReturnType:
        ...
    
    @service_update
    def execute_task(self, args: str) -> ReturnType:
        ...

# Management Canister Service
class AgentRegistryInterface(Service):

    @service_query
    def get_agent_by_name(self, agent_name: str) -> ReturnType:
        ...
    
    @service_update
    def get_list_agents(self) -> ReturnType:
        ...