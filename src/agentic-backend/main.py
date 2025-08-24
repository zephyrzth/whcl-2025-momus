from kybra import (
    Service, service_update, Principal, Async,
    Record, Variant, Vec, Opt, update, query, match
)

from llm import *
from typing import List, Optional
import json

storage_name = []

@update
def greeting_name(name: str) -> str:
    storage_name.append(name)
    return f"Hello, {name}!"

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

        ic.print(response)
        
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
    Principal,
    update
)
import gzip
import hashlib
from canister import *

# Storage
deployments = StableBTreeMap[str, DeploymentRecord](
    memory_id=0, max_key_size=64, max_value_size=1000
)

@update
def deploy_gzipped_wasm(gzipped_wasm: blob) -> DeployResult:
    """
    Accepts a gzipped WASM module and deploys it as a new canister.
    """
    ic.print("🚀 Starting deployment...")

    try:
        # Record compressed size
        compressed_size = len(gzipped_wasm)

        ic.print(f"📦 Compressed size: {compressed_size} bytes")
        
        # Decompress the WASM
        try:
            wasm_module = gzip.decompress(gzipped_wasm)
        except Exception as e:
            return {"Err": f"Failed to decompress WASM: {str(e)}"}
        
        # Record decompressed size
        original_size = len(wasm_module)

        ic.print(f"📦 Original size: {original_size} bytes")
        
        # Calculate hash for tracking
        wasm_hash = hashlib.sha256(wasm_module).hexdigest()[:16]

        ic.print(f"🔑 WASM hash: {wasm_hash}")
        
        # Get management canister
        management = ManagementCanister(Principal.from_str("aaaaa-aa"))
        
        # Create canister args
        create_args = {
            "settings": {
                "controllers": [ic.id()],
                "compute_allocation": None,
                "memory_allocation": None,
                "freezing_threshold": None
            }
        }
        
        # Create new canister with cycles
        cycles_to_send = 100_000_000_000  # 0.1T cycles
        
        create_result = management.create_canister(create_args).with_cycles128(cycles_to_send)

        ic.print(f"🆕 Created canister with cycles: {create_result}")
        
        if not create_result:
            return {"Err": "Failed to create canister"}
        
        new_canister_id = create_result["canister_id"]
        
        ic.print(f"🆕 New canister ID: {new_canister_id}")
        
        # Install the WASM code
        install_args = {
            "mode": {"install": None},
            "canister_id": new_canister_id,
            "wasm_module": wasm_module,
            "arg": b""
        }
        
        management.install_code(install_args)
        
        # Record the deployment
        deployment = DeploymentRecord(
            canister_id=str(new_canister_id),
            wasm_hash=wasm_hash,
            deployed_at=ic.time(),
            original_size=original_size,
            compressed_size=compressed_size
        )
        
        # Store deployment record
        deployment_id = f"{wasm_hash}_{ic.time()}"
        deployments.insert(deployment_id, deployment)
        
        ic.print(f"✅ Deployed canister: {new_canister_id}")
        ic.print(f"📊 Original: {original_size} bytes, Compressed: {compressed_size} bytes")
        
        return {"Ok": deployment}
        
    except Exception as e:
        return {"Err": f"Deployment failed: {str(e)}"}
    