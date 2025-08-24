# deploy_helper.py - Run this locally to deploy WASM files
import subprocess
import subprocess
import gzip
import os
import tqdm

def upload_wasm(wasm_path, canister_name="my-canister", backend="agentic-backend"):
    
    print(f"Reading {wasm_path}...")
    
    # Read WASM file
    with open(wasm_path, 'rb') as f:
        wasm_bytes = f.read()
    
    print(f"Size: {len(wasm_bytes) / 1024 / 1024:.2f} MB")
    
    # Compress it
    print("Compressing...")
    compressed = gzip.compress(wasm_bytes, compresslevel=9)
    print(f"Compressed: {len(compressed) / 1024 / 1024:.2f} MB")
    
    # Split into 400KB chunks
    chunk_size = 10 * 1024
    chunks = [compressed[i:i+chunk_size] for i in range(0, len(compressed), chunk_size)]
    print(f"Chunks: {len(chunks)}")
    
    # Start upload
    print("Starting upload...")
    cmd = f'dfx canister call {backend} start_wasm_upload \'("{canister_name}", {len(chunks)}, {len(compressed)}, true)\''
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)
    upload_id = result.stdout.strip().strip('("').strip('")')
    print(f"Upload ID: {upload_id}")
    
    # Upload chunks
    for i, chunk in enumerate( tqdm.tqdm( chunks ) ):
        
        # Convert chunk to vec format
        vec_str = "vec { " + "; ".join(f"{b} : nat8" for b in chunk) + " }"
        
        cmd = f"""dfx canister call {backend} upload_wasm_chunk '("{upload_id}", {i} : nat64, {vec_str})'"""
        result = subprocess.run(cmd, shell=True, capture_output=True)

        if result.stderr:
            exit("Upload Error : %s", result.stderr) 
    
    print(f"\nDeploying...")
    
    # Deploy
    cmd = f'dfx canister call {backend} deploy_uploaded_wasm \'("{upload_id}", "{canister_name}", 2000000000000 : nat64)\''
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)

# Usage
upload_wasm(
    wasm_path="./build/build.wasm",
    canister_name="new-backend", 
    backend="agentic-backend"
)
