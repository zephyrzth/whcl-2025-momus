from kybra import (
    blob,
    nat,
    nat32,
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


# Chunked code install types
class UploadChunkArgs(Record):
    canister_id: Principal
    chunk: blob


class UploadChunkReply(Record):
    chunk_id: nat32


class InstallChunkedCodeArgs(Record):
    mode: InstallMode
    canister_id: Principal
    chunk_ids: Vec[nat32]
    wasm_module_hash: Opt[blob]
    arg: blob
    sender_canister_version: Opt[nat64]


class ClearChunkStoreArgs(Record):
    canister_id: Principal


# Management Canister Service
class ManagementCanister(Service):
    @service_update
    def create_canister(self, args: CreateCanisterArgs) -> CreateCanisterResult: ...

    @service_update
    def install_code(self, args: InstallCodeArgs) -> null: ...

    # Chunked code installation APIs
    @service_update
    def upload_chunk(self, args: UploadChunkArgs) -> UploadChunkReply: ...

    @service_update
    def install_chunked_code(self, args: InstallChunkedCodeArgs) -> null: ...

    @service_update
    def clear_chunk_store(self, args: ClearChunkStoreArgs) -> null: ...


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


# Upload session tracking
class UploadSession(Record):
    session_id: str
    uploader: Principal
    total_size: nat64
    chunk_count: nat64
    uploaded_chunks: nat64
    created_at: nat64
    completed: bool


class ChunkUploadSuccess(Record):
    chunk_index: nat64
    uploaded_chunks: nat64
    total_chunks: nat64


class ChunkUploadResult(Variant, total=False):
    Ok: ChunkUploadSuccess
    Err: str
