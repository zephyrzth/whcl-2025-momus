# deploy_helper.py - Run this locally to deploy WASM files
import subprocess
import json
import base64

def deploy_wasm_file(wasm_path, canister_name, cycles, backend_canister):
    """
    Helper to deploy a WASM file to IC via your backend canister
    """
    # Read WASM file
    with open(wasm_path, 'rb') as f:
        wasm_bytes = f.read()

    # print(wasm_bytes)
    
    # Convert to vec format for dfx
    wasm_bytes = "vec { " + "; ".join(str(b) for b in wasm_bytes) + " }"
    
    # Call the backend canister
    cmd = f'''dfx canister call {backend_canister} deploy_wasm_canister '(
        {vec_format},
        "{canister_name}",
        {cycles}
    )' '''

    print(cmd)
    
    # result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    # print(result.stdout)

# Usage
print("ahahha")
deploy_wasm_file(
    wasm_path="./build/build.wasm",
    canister_name="new-backend", 
    cycles=2_000_000_000_000,
    backend_canister="agentic-backend"
)
