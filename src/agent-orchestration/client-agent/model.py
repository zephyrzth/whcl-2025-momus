
from kybra import (
    Service, service_update, service_query,Record
)


class ReturnType(Record):
    Ok: str
    Err: str

# Management Canister Service
class AgentInterface(Service):
    @service_query
    def get_metadata(self) -> str:
        ...
    
    @service_update
    def execute_task(self, args: str) -> str:
        ...