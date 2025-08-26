import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";

// Use generated declarations from dfx for the ICP ledger canister
// Path mirrors other services (e.g., backendService)
import type { _SERVICE as LedgerService } from "../../../declarations/icp_ledger/icp_ledger.did";

export interface LedgerInfo {
  principalId: string;
  accountIdHex: string; // Account Identifier as 64-char hex string
  balanceE8s: bigint; // raw e8s
}

function bytesToHex(bytes: Uint8Array | number[]): string {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getAuthenticatedLedger(): Promise<{
  actor: LedgerService;
  canisterId: string;
  host: string;
}> {
  const authClient = await AuthClient.create();
  const identity = authClient.getIdentity();

  const { canisterId, createActor } = await import(
    "../../../declarations/icp_ledger"
  );
  if (!canisterId) {
    throw new Error(
      "ICP Ledger canister ID not found. Ensure dfx generate has run and CANISTER_ID_ICP_LEDGER is set.",
    );
  }

  const isLocal = process.env.DFX_NETWORK !== "ic";
  const host = isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io";

  const actor = createActor(canisterId, {
    agentOptions: {
      host,
      identity: identity as any,
    },
  }) as unknown as LedgerService;

  // In local dev, fetch root key
  if (isLocal) {
    try {
      const { HttpAgent } = await import("@dfinity/agent");
      const agent = new HttpAgent({ host, identity: identity as any });
      await agent.fetchRootKey();
    } catch (_) {
      // ignore
    }
  }

  return { actor, canisterId, host };
}

export const ledgerService = {
  // Get account identifier (hex) and balance for current principal
  async getLedgerInfoForPrincipal(principalId: string): Promise<LedgerInfo> {
    if (!principalId) {
      throw new Error("Missing principalId");
    }

    const { actor } = await getAuthenticatedLedger();
    const owner = Principal.fromText(principalId);

    // Default subaccount = none
    const account = { owner, subaccount: [] as [] } as const;

    // Compute account identifier (Vec<Nat8>) -> hex
    const acctIdBytes = await (actor as any).account_identifier(account);
    const accountIdHex = bytesToHex(acctIdBytes);

    // Use ICRC-1 balance (returns Nat as bigint)
    const raw = (await (actor as any).icrc1_balance_of(account)) as bigint;

    return {
      principalId,
      accountIdHex,
      balanceE8s: BigInt(raw),
    };
  },

  // Helper to format e8s to ICP string with 4 decimals
  formatIcp(e8s: bigint): string {
    const ICP_DECIMALS = 8n;
    const denom = 10n ** ICP_DECIMALS; // 1e8
    const whole = e8s / denom;
    const frac = e8s % denom; // 0..1e8-1
    const fracStr = frac.toString().padStart(Number(ICP_DECIMALS), "0");
    const full = `${whole}.${fracStr}`;

    // Round to 4 decimals
    const num = Number(full);
    return `${num.toFixed(4)} ICP`;
  },
};
