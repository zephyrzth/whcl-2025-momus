from kybra import (
    Principal,
    Async,
    Opt,
    update,
    query,
    match,
    nat64,
    Record,
    Variant,
)

from canister import (
    ManagementCanister,
    UploadSession,
    ChunkUploadResult,
    DeploymentRecord,
    DeployResult,
)

from llm import *
from typing import List, Optional
import json

storage_name = []


@update
def greeting_name(name: str) -> str:
    ic.print(f"Greeting {name}")
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
            create_user_message(user_input),
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
                                "description": "refined query that contains relevant information to get weather data",
                            }
                        },
                        "required": ["prompt"],
                    },
                ),
                create_function_tool(
                    name="call__air_quality_agent",
                    description="Calling Agentic AI for get and analyzing the air quality data",
                    params={
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "refined query that contains relevant information to get air quality data",
                            }
                        },
                        "required": ["prompt"],
                    },
                ),
            ]

        # Create request using ChatRequestV1 type
        request = {"model": "llama3.1:8b", "tools": tools, "messages": messages}

        # Call service
        response_raw = yield llm_service.v1_chat(request)

        response = match(response_raw, {"Ok": lambda ok: ok, "Err": lambda err: err})

        ic.print(response)

        # Process response
        if response and "message" in response:
            message = response["message"]
            return json.dumps(
                {
                    "content": message.get("content"),
                    "tool_calls": message.get("tool_calls", []),
                }
            )

        return json.dumps({"response": str(response)})

    except Exception as e:
        return json.dumps({"error": str(e)})


# ================================= DEPLOY WASM =================================

from kybra import StableBTreeMap, blob, ic, Principal, update, query
import gzip
import hashlib


# Types come from canister.py


# Storage for chunks and deployments
chunk_storage = StableBTreeMap[str, blob](
    memory_id=1, max_key_size=128, max_value_size=2_000_000  # ~2MB chunks
)

upload_sessions = StableBTreeMap[str, UploadSession](
    memory_id=2, max_key_size=64, max_value_size=500
)

deployments = StableBTreeMap[str, DeploymentRecord](
    memory_id=0, max_key_size=64, max_value_size=1000
)


@update
def start_chunk_upload(total_size: nat64, chunk_count: nat64) -> str:
    """Initialize a new chunk upload session"""
    session_id = hashlib.sha256(f"{ic.caller()}_{ic.time()}".encode()).hexdigest()[:32]

    # Build a typed UploadSession record value
    session: UploadSession = {
        "session_id": session_id,
        "uploader": ic.caller(),
        "total_size": total_size,
        "chunk_count": chunk_count,
        "uploaded_chunks": 0,
        "created_at": ic.time(),
        "completed": False,
    }

    upload_sessions.insert(session_id, session)
    ic.print(f"📤 Started upload session: {session_id}")

    return session_id


@update
def upload_chunk(
    session_id: str, chunk_index: nat64, chunk_data: blob
) -> ChunkUploadResult:
    """Upload a single chunk of the WASM file"""

    # Validate session exists
    session_opt = upload_sessions.get(session_id)
    if not session_opt:
        return {"Err": "Invalid session ID"}

    session = session_opt

    # Validate uploader
    # if session["uploader"] != ic.caller():
    #     return {"Err": "Unauthorized uploader"}

    # Validate session not completed
    if session["completed"]:
        return {"Err": "Upload session already completed"}

    # Validate chunk index
    if chunk_index >= session["chunk_count"]:
        return {"Err": f"Invalid chunk index: {chunk_index}"}

    # Store chunk
    chunk_key = f"{session_id}_{chunk_index}"
    chunk_storage.insert(chunk_key, chunk_data)

    # Update session
    session["uploaded_chunks"] += 1
    upload_sessions.insert(session_id, session)

    ic.print(f"📦 Uploaded chunk {chunk_index + 1}/{session['chunk_count']}")

    return {
        "Ok": {
            "chunk_index": chunk_index,
            "uploaded_chunks": session["uploaded_chunks"],
            "total_chunks": session["chunk_count"],
        }
    }


@query
def get_upload_status(session_id: str) -> Opt[UploadSession]:
    """Get the status of an upload session"""
    return upload_sessions.get(session_id)


@update
def deploy_from_chunks(session_id: str) -> Async[DeployResult]:
    """
    Reassemble chunks and deploy the WASM module
    """
    ic.print("🚀 Starting deployment from chunks...")

    try:
        # Validate session
        session_opt = upload_sessions.get(session_id)
        if not session_opt:
            return {"Err": "Invalid session ID"}

        session = session_opt

        # Validate uploader
        # if session["uploader"] != ic.caller():
        #     return {"Err": "Unauthorized"}

        # Validate all chunks uploaded
        if session["uploaded_chunks"] != session["chunk_count"]:
            return {
                "Err": f"Missing chunks: {session['uploaded_chunks']}/{session['chunk_count']}"
            }

        # Reassemble chunks
        ic.print(f"🔧 Reassembling {session['chunk_count']} chunks...")
        gzipped_wasm = bytearray()

        for chunk_index in range(session["chunk_count"]):
            chunk_key = f"{session_id}_{chunk_index}"
            chunk_opt = chunk_storage.get(chunk_key)

            if not chunk_opt:
                return {"Err": f"Missing chunk {chunk_index}"}

            gzipped_wasm.extend(chunk_opt)

        # Verify total size
        if len(gzipped_wasm) != session["total_size"]:
            return {
                "Err": f"Size mismatch: expected {session['total_size']}, got {len(gzipped_wasm)}"
            }

        ic.print(f"✅ Reassembled {len(gzipped_wasm)} bytes")

        # Now deploy using the existing logic
        result = yield _deploy_wasm_internal(bytes(gzipped_wasm))

        # Mark session as completed and cleanup chunks
        if "Ok" in result:
            session["completed"] = True
            upload_sessions.insert(session_id, session)

            # Cleanup chunks to free memory
            for chunk_index in range(session["chunk_count"]):
                chunk_key = f"{session_id}_{chunk_index}"
                chunk_storage.remove(chunk_key)

            ic.print(f"🧹 Cleaned up {session['chunk_count']} chunks")

        return result

    except Exception as e:
        return {"Err": f"Deployment from chunks failed: {str(e)}"}


@update
def _deploy_wasm_internal(
    gzipped_wasm: blob,
) -> Async[DeployResult]:
    """
    Internal function to deploy WASM (extracted from original deploy_gzipped_wasm)
    """
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

        # Enforce management canister payload limit (~10 MiB)
        MAX_INSTALL_PAYLOAD_BYTES = 10_485_760  # 10 MiB

        # Calculate hash for tracking
        wasm_hash = hashlib.sha256(wasm_module).hexdigest()[:16]
        ic.print(f"🔑 WASM hash: {wasm_hash}")

        # Create canister args
        create_args = {
            "settings": {
                "controllers": [ic.id()],
                "compute_allocation": None,
                "memory_allocation": None,
                "freezing_threshold": None,
            }
        }

        # Create new canister with cycles (retry on rare collisions)
        cycles_to_send = 700_000_000_000  # 0.7T cycles
        MAX_CREATE_RETRIES = 5
        create_result_data = None
        # Bind our typed management canister (with chunked APIs)
        mgmt = ManagementCanister(Principal.from_str("aaaaa-aa"))

        for attempt in range(1, MAX_CREATE_RETRIES + 1):
            create_call = yield mgmt.create_canister(create_args).with_cycles128(
                cycles_to_send
            )
            create_match = match(
                create_call,
                {
                    "Ok": lambda data: {"ok": True, "data": data},
                    "Err": lambda err: {"ok": False, "error": str(err)},
                },
            )
            if not create_match.get("ok"):
                err_msg = create_match.get("error") or "Unknown create_canister error"
                if "already exists" in err_msg.lower():
                    ic.print(
                        f"⚠️ create_canister reported an existing ID (attempt {attempt}/{MAX_CREATE_RETRIES}), retrying..."
                    )
                    continue
                return {"Err": err_msg}
            create_result_data = create_match["data"]
            break

        if not create_result_data:
            return {"Err": "Failed to create canister after retries"}

        ic.print(f"🆕 Created canister with cycles: {create_result_data}")
        new_canister_id = create_result_data["canister_id"]
        ic.print(f"🆕 New canister ID: {new_canister_id}")

        # Install the WASM code. Use chunked install if exceeding payload limit
        if original_size <= MAX_INSTALL_PAYLOAD_BYTES:
            install_args = {
                "mode": {"install": None},
                "canister_id": new_canister_id,
                "wasm_module": wasm_module,
                "arg": bytes(),
            }
            install_call = yield mgmt.install_code(install_args)
            install_match = match(
                install_call,
                {
                    "Ok": lambda _: {"Ok": True},
                    "Err": lambda err: {"Err": err},
                },
            )
            if not install_match.get("Ok"):
                err = install_match["Err"]
                return {"Err": err}
        else:
            # Chunked upload to management canister
            ic.print("📤 Using chunked install flow")
            CHUNK_SIZE = 1_000_000  # 1MB chunks to stay well under limits
            chunk_ids: List[int] = []  # nat32 compatible

            try:
                offset = 0
                chunk_index = 0
                while offset < original_size:
                    end = min(offset + CHUNK_SIZE, original_size)
                    chunk = wasm_module[offset:end]
                    upload_args = {"canister_id": new_canister_id, "chunk": chunk}
                    upload_call = yield mgmt.upload_chunk(upload_args)
                    upload_match = match(
                        upload_call,
                        {
                            "Ok": lambda ok: {"Ok": ok},
                            "Err": lambda err: {"Err": err},
                        },
                    )
                    ic.print(f"Upload match: {upload_match}")
                    if not upload_match.get("Ok"):
                        err_str = str(upload_match["Err"]).lower()
                        if (
                            "no such method" in err_str
                            or "method not found" in err_str
                            or "failed to decode" in err_str
                        ):
                            return {
                                "Err": (
                                    "Chunked install not supported by this replica/dfx. "
                                    "Please upgrade your local dfx/replica to a version that supports "
                                    "management canister chunked code installation (upload_chunk/install_chunked_code)."
                                )
                            }
                        return {
                            "Err": f"upload_chunk failed at {chunk_index}: {upload_match['Err']}"
                        }
                    # upload_chunk returns a record { chunk_id: nat32 }
                    ok = upload_match["Ok"]
                    chunk_ids.append(int(ok["chunk_id"]))
                    chunk_index += 1
                    offset = end
                    ic.print(
                        f"📦 Uploaded mgmt chunk {chunk_index}, bytes {len(chunk)}"
                    )

                # Install using uploaded chunks
                install_chunked_args = {
                    "mode": {"install": None},
                    "canister_id": new_canister_id,
                    "chunk_ids": chunk_ids,
                    "wasm_module_hash": None,
                    "arg": bytes(),
                    "sender_canister_version": None,
                }
                install_chunked_call = yield mgmt.install_chunked_code(
                    install_chunked_args
                )
                install_chunked_match = match(
                    install_chunked_call,
                    {
                        "Ok": lambda _: {"Ok": True},
                        "Err": lambda err: {"Err": err},
                    },
                )
                if not install_chunked_match.get("Ok"):
                    err = install_chunked_match["Err"]
                    return {"Err": err}

                # cleanup
                try:
                    yield mgmt.clear_chunk_store({"canister_id": new_canister_id})
                except Exception as _:
                    pass
            except Exception as e:
                # best-effort cleanup
                try:
                    yield mgmt.clear_chunk_store({"canister_id": new_canister_id})
                except Exception as _:
                    pass
                return {"Err": f"Chunked install failed: {str(e)}"}

        # Record the deployment
        deployment = DeploymentRecord(
            canister_id=str(new_canister_id),
            wasm_hash=wasm_hash,
            deployed_at=ic.time(),
            original_size=original_size,
            compressed_size=compressed_size,
        )

        # Store deployment record
        deployment_id = f"{wasm_hash}_{ic.time()}"
        deployments.insert(deployment_id, deployment)

        ic.print(f"✅ Deployed canister: {new_canister_id}")
        ic.print(
            f"📊 Original: {original_size} bytes, Compressed: {compressed_size} bytes"
        )

        return {"Ok": deployment}

    except Exception as e:
        return {"Err": f"Deployment failed: {str(e)}"}


# Keep original function for backward compatibility
@update
def deploy_gzipped_wasm(gzipped_wasm: blob) -> Async[DeployResult]:
    """
    Legacy function - accepts entire WASM as single blob (for smaller files)
    """
    ic.print("⚠️  Using legacy single-blob upload")
    return _deploy_wasm_internal(gzipped_wasm)
