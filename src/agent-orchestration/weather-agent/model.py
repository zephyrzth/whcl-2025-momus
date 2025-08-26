
from kybra import (
    Service, service_update, service_query, Opt, Variant
)

from typing import List, Optional

class ReturnType(Variant, total=False):
    Ok: Opt[str]
    Err: Opt[str]

# Management Canister Service
class AgentInterface(Service):
    @service_query
    def get_metadata(self) -> str:
        ...
    
    @service_update
    def execute_task(self, args: str) -> str:
        ...
