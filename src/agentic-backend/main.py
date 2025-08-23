from kybra import nat8, query, update, StableBTreeMap, ic

# Persistent storage for last greeted name
last_name_storage = StableBTreeMap[str, str](memory_id=0, max_key_size=50, max_value_size=100)

@update
def greet(name: str) -> str:
    # Intentionally wrong implementation at first to make test fail (per red-green cycle)
    # We'll store the name but return a different string than expected test
    last_name_storage.insert("last_name", name)
    return f"hello world {name}"  # Missing name to force test failure initially

@query
def last_name() -> str:
    value = last_name_storage.get("last_name")
    if value is None:
        return ""
    return value

# main.py - Fixed with proper Kybra type annotations
from kybra import (
    update, query, Principal, nat64, Vec, ic, Async
)
from kybra.canisters.management import ManagementCanister
import json

# Track deployed canisters
deployed_canisters = {}

@update
def deploy_wasm_canister(
    wasm_bytes: Vec[nat8],
    canister_name: str,
    cycles: nat64
) -> str:
    """
    Create a new canister and install WASM code to it.
    
    Args:
        wasm_bytes: The compiled WASM module as bytes
        canister_name: Name for tracking the canister
        cycles: Initial cycles for the new canister
    
    Returns:
        JSON string with deployment result
    """
    try:
        # Step 1: Create a new canister
        management = ManagementCanister(Principal.from_str("aaaaa-aa"))
        
        create_result = management.create_canister({
            "settings": None
        }).with_cycles(cycles)
        
        # Extract canister ID
        if isinstance(create_result, tuple):
            canister_id = str(create_result[0])
        else:
            canister_id = str(create_result)
        
        # Step 2: Install the WASM code
        management.install_code({
            "mode": {"install": None},
            "canister_id": Principal.from_str(canister_id),
            "wasm_module": bytes(wasm_bytes),
            "arg": bytes()  # Empty initialization argument
        })
        
        # Step 3: Track the deployed canister
        deployed_canisters[canister_id] = {
            "name": canister_name,
            "deployed_at": ic.time(),
            "deployed_by": str(ic.caller()),
            "wasm_size": len(wasm_bytes)
        }
        
        return json.dumps({
            "success": True,
            "canister_id": canister_id,
            "message": f"Successfully deployed {canister_name} at {canister_id}"
        })
        
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        })

@query
def list_deployed_canisters() -> Vec[str]:  # Changed from list[str] to Vec[str]
    """
    List all deployed canisters
    """
    result = []
    for cid, info in deployed_canisters.items():
        result.append(f"{cid}: {info['name']}")
    return result  # Python list automatically converts to Vec

@query
def get_deployment_info() -> str:
    """
    Get deployment information as JSON
    """
    return json.dumps(deployed_canisters)