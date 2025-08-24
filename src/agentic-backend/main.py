from kybra import (
    Service, service_update, Principal, Async,
    Record, Variant, Vec, Opt, update, query, match
)

from llm import *
from typing import List, Optional
import json

@update
def call_llm_v1(user_input: str, use_tools: bool = False) -> Async[str]:
    """Call LLM using the class-based types"""
    try:
        # Create service instance
        llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))
        
        # Create messages
        messages = [
            create_system_message("You are a helpful assistant."),
            create_user_message(user_input)
        ]
        
        # Create tools if requested
        tools = None

        if use_tools:
            tools = [
                create_function_tool(
                    name="call__weather_agent",
                    description="Calling Agentic AI for get and analyzing the weather data",
                    params={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "refined query that contains relevant information to get weather data"
                            }
                        },
                        "required": ["prompt"]
                    }
                ),
                create_function_tool(
                    name="call__air_quality_agent",
                    description="Calling Agentic AI for get and analyzing the air quality data",
                    params={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "refined query that contains relevant information to get air quality data"
                            }
                        },
                        "required": ["prompt"]
                    }
                )
            ]
        
        # Create request using ChatRequestV1 type
        request = {
            "model": "llama3.1:8b",
            "tools": tools,
            "messages": messages
        }
        
        # Call service
        response_raw = yield llm_service.v1_chat(request)

        response = match(response_raw, {"Ok": lambda ok: ok, "Err": lambda err: err})

        print(response)
        
        # Process response
        if response and "message" in response:
            message = response["message"]
            return json.dumps({
                "content": message.get("content"),
                "tool_calls": message.get("tool_calls", [])
            })
        
        return json.dumps({"response": str(response)})
        
    except Exception as e:
        return json.dumps({"error": str(e)})

# ================================= DEPLOY WASM =================================

from kybra import (
    StableBTreeMap,
    blob,
    ic,
    init,
    nat,
    nat64,
    Principal,
    query,
    Record,
    update,
    Vec,
    Variant,
)
import gzip
import hashlib

# Define types for deployment tracking
class DeploymentRecord(Record):
    canister_id: Principal
    wasm_hash: str
    deployed_at: nat64
    original_size: nat64
    compressed_size: nat64

class DeployResult(Variant):
    Ok: DeploymentRecord
    Err: str

# Storage for deployment records
deployments = StableBTreeMap[str, DeploymentRecord](
    memory_id=0, max_key_size=64, max_value_size=1000
)


@update
def deploy_gzipped_wasm(gzipped_wasm: blob) -> DeployResult:
    """
    Accepts a gzipped WASM module and deploys it as a new canister.
    
    Args:
        gzipped_wasm: The gzipped WASM binary
    
    Returns:
        DeployResult containing the new canister ID or an error
    """
    try:
        # Record compressed size
        compressed_size = len(gzipped_wasm)
        
        # Decompress the WASM
        try:
            wasm_module = gzip.decompress(gzipped_wasm)
        except Exception as e:
            return DeployResult.Err(f"Failed to decompress WASM: {str(e)}")
        
        # Record decompressed size
        original_size = len(wasm_module)
        
        # Calculate hash for tracking
        wasm_hash = hashlib.sha256(wasm_module).hexdigest()[:16]
        
        # Create a new canister with cycles
        cycles_to_send = 100_000_000_000  # 0.1T cycles
        
        # Call the management canister to create a new canister
        # Using default settings (deployer canister will be the controller)
        create_result = ic.call_with_payment(
            Principal.from_str("aaaaa-aa"),  # Management canister
            "create_canister",
            (),  # Empty args for default settings
            cycles_to_send
        )
        
        if not create_result:
            return DeployResult.Err("Failed to create canister")
        
        new_canister_id = create_result[0]["canister_id"]
        
        # Install the WASM code to the new canister
        ic.call(
            Principal.from_str("aaaaa-aa"),
            "install_code",
            ({
                "mode": {"install": None},
                "canister_id": new_canister_id,
                "wasm_module": wasm_module,
                "arg": b""
            },)
        )
        
        # Record the deployment
        deployment = DeploymentRecord(
            canister_id=new_canister_id,
            wasm_hash=wasm_hash,
            deployed_at=ic.time(),
            original_size=original_size,
            compressed_size=compressed_size
        )
        
        # Store deployment record
        deployment_id = f"{wasm_hash}_{ic.time()}"
        deployments.insert(deployment_id, deployment)
        
        print(f"✅ Deployed canister: {new_canister_id}")
        print(f"📊 Original: {original_size} bytes, Compressed: {compressed_size} bytes")
        
        return DeployResult.Ok(deployment)
        
    except Exception as e:
        return DeployResult.Err(f"Deployment failed: {str(e)}")

# @query
# def get_deployments() -> Vec[DeploymentRecord]:
#     """
#     Get all deployment records.
#     """
#     return [record for _, record in deployments.items()]

# @query
# def get_deployment_stats() -> dict:
#     """
#     Get statistics about deployments.
#     """
#     class Stats(Record):
#         total_deployments: nat
#         total_original_bytes: nat64
#         total_compressed_bytes: nat64
#         average_compression_ratio: float
    
#     deployments_list = list(deployments.values())
    
#     if not deployments_list:
#         return Stats(
#             total_deployments=0,
#             total_original_bytes=0,
#             total_compressed_bytes=0,
#             average_compression_ratio=0.0
#         )
    
#     total_original = sum(d.original_size for d in deployments_list)
#     total_compressed = sum(d.compressed_size for d in deployments_list)
    
#     return Stats(
#         total_deployments=len(deployments_list),
#         total_original_bytes=total_original,
#         total_compressed_bytes=total_compressed,
#         average_compression_ratio=total_compressed / total_original if total_original > 0 else 0.0
#     )

# @query
# def get_deployment_by_hash(wasm_hash: str) -> Vec[DeploymentRecord]:
#     """
#     Find deployments by WASM hash prefix.
#     """
#     matching = []
#     for key, record in deployments.items():
#         if record.wasm_hash.startswith(wasm_hash):
#             matching.append(record)
#     return matching