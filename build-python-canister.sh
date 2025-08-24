canister_name=$1;

mkdir -p ./.kybra/${canister_name} || true;
pip3 install -r ./src/${canister_name}/requirements.txt --break-system-packages;
python3 -m kybra build ./src/${canister_name}/main.py;
mv ./.kybra/build/build.wasm ./.kybra/${canister_name}/${canister_name}.wasm;
rm -r ./.kybra/build;
