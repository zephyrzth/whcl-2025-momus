from kybra import (
    blob,
    nat,
    nat64,
    null,
    Opt,
    Principal,
    Record,
    Service,
    service_update,
    Vec,
    Variant,
)

# Define Install Mode as a separate Variant
class InstallMode(Variant, total=False):
    install: null
    reinstall: null
    upgrade: null

# Management Canister Types
class CanisterSettings(Record):
    controllers: Opt[Vec[Principal]]
    compute_allocation: Opt[nat]
    memory_allocation: Opt[nat]
    freezing_threshold: Opt[nat]

class CreateCanisterArgs(Record):
    settings: Opt[CanisterSettings]

class CreateCanisterResult(Record):
    canister_id: Principal

class InstallCodeArgs(Record):
    mode: InstallMode
    canister_id: Principal
    wasm_module: blob
    arg: blob

# Management Canister Service
class ManagementCanister(Service):
    @service_update
    def create_canister(self, args: CreateCanisterArgs) -> CreateCanisterResult:
        ...
    
    @service_update
    def install_code(self, args: InstallCodeArgs) -> null:
        ...

# Deployment tracking types
class DeploymentRecord(Record):
    canister_id: str
    wasm_hash: str
    deployed_at: nat64
    original_size: nat64
    compressed_size: nat64

class DeployResult(Variant, total=False):
    Ok: DeploymentRecord
    Err: str
