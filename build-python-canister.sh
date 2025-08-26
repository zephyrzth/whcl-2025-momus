group=$1;
canister_name=$2;

mkdir -p ./.kybra/${group}${canister_name} || true;
pip3 install -r ./src/${group}${canister_name}/requirements.txt --break-system-packages;
python3 -m kybra build ./src/${group}${canister_name}/main.py;
mv ./.kybra/build/build.wasm ./.kybra/${group}${canister_name}/${canister_name}.wasm;
rm -r ./.kybra/build;
