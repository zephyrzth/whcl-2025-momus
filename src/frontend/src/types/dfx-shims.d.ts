declare module "*.dfx/local/canisters/icp_index_canister/index.js" {
  export const canisterId: string;
  export function createActor(
    canisterId: string,
    options?: any,
  ): Promise<any> | any;
}

declare module "../../../../.dfx/local/canisters/icp_index_canister/index.js" {
  export const canisterId: string;
  export function createActor(canisterId: string, options?: any): any;
}
