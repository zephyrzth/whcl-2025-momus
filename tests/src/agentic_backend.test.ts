import { describe, beforeEach, afterEach, it, expect, inject } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PocketIc, type Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";

// We don't have generated TypeScript bindings yet; define minimal IDL inline.
// After implementing real greeting we can replace with generated did.js if produced.
// Candid expected: service { greet: (text) -> (text); last_name: () -> (text) query }
import { IDL } from "@dfinity/candid";

const idlFactory = ({ IDL: idl }: { IDL: typeof IDL }) => {
  return idl.Service({
    greet: idl.Func([idl.Text], [idl.Text], []),
    last_name: idl.Func([], [idl.Text], ["query"]),
  });
};

export type _SERVICE = {
  greet: (name: string) => Promise<string>;
  last_name: () => Promise<string>;
};

// Path where kybra build would output wasm (matches dfx.json config)
export const WASM_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "agentic-backend",
  "agentic-backend.wasm",
);

describe("Agentic Backend (Kybra)", () => {
  let pic: PocketIc;
  // @ts-ignore used by setup
  let canisterId: Principal;
  let actor: Actor<_SERVICE>;

  beforeEach(async () => {
    pic = await PocketIc.create(inject("PIC_URL"));

    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory: idlFactory as any,
      wasm: WASM_PATH,
    });

    actor = fixture.actor;
    canisterId = fixture.canisterId;
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it("should greet with provided name (expected to fail initially - red phase)", async () => {
    const response = await actor.greet("Alice");
    // Intentionally assert the final desired behavior which currently should FAIL
    expect(response).toEqual("hello world Alice");
  });

  it("should persist last greeted name", async () => {
    await actor.greet("Bob");
    const stored = await actor.last_name();
    expect(stored).toEqual("Bob");
  });
});
