
export CANISTER_CANDID_PATH='./build/build.did';
python3 -m kybra build main.py;
mv ./.kybra/build/build.wasm ./build/build.wasm;
rm -r ./.kybra/