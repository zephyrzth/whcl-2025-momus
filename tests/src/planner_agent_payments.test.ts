import { describe, beforeEach, afterEach, it, expect, inject } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PocketIc, type Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";

// Planner Agent under test
import {
  type _SERVICE as PlannerService,
  idlFactory as plannerIdl,
} from "../../src/declarations/agent-planner_agent/agent-planner_agent.did.js";

// Weather Agent (as a target) — used only to satisfy registry routing
import {
  type _SERVICE as WeatherService,
  idlFactory as weatherIdl,
} from "../../src/declarations/agent-weather_agent/agent-weather_agent.did.js";

// Agent Registry handles discovery/routing
import {
  type _SERVICE as RegistryService,
  idlFactory as registryIdl,
} from "../../src/declarations/agent-registry/agent-registry.did.js";

// Placeholder for ICRC token canister (to be implemented)
// We'll use a minimal interface expectation for approve/transfer_from behavior

export const PLANNER_WASM = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "agent-planner_agent",
  "agent-planner_agent.wasm",
);

export const WEATHER_WASM = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "agent-weather_agent",
  "agent-weather_agent.wasm",
);

export const REGISTRY_WASM = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "agent-registry",
  "agent-registry.wasm",
);

describe("Planner Agent MOMUS fees", () => {
  let pic: PocketIc;
  let planner: Actor<PlannerService>;
  let weather: Actor<WeatherService>;
  let registry: Actor<RegistryService>;
  let caller: Principal;

  beforeEach(async () => {
    // @ts-ignore injected
    pic = await PocketIc.create(inject("PIC_URL"));

    // Deploy canisters needed for planner flow
    const registryFx = await pic.setupCanister<RegistryService>({
      idlFactory: registryIdl,
      wasm: REGISTRY_WASM,
    });
    registry = registryFx.actor;

    const weatherFx = await pic.setupCanister<WeatherService>({
      idlFactory: weatherIdl,
      wasm: WEATHER_WASM,
    });
    weather = weatherFx.actor;

    const plannerFx = await pic.setupCanister<PlannerService>({
      idlFactory: plannerIdl,
      wasm: PLANNER_WASM,
    });
    planner = plannerFx.actor;

    // Simulate the caller principal (end-user)
    caller = Principal.anonymous();

    // Wire the registry with the weather canister so planner can route
    const regRes = await registry.registerAgent(weatherFx.canisterId.toText());
    expect("ok" in regRes).toBe(true);
  });

  afterEach(async () => {
    await pic?.tearDown();
  });

  it("should reject planner.execute_task when caller has not approved sufficient MOMUS allowance", async () => {
    // Execute planner task without setting any allowance on token
    const result = await planner.execute_task("What's the weather in Tokyo?");

    // Expect the planner to block due to insufficient allowance for MOMUS fee
    // The exact error string can be refined; we assert the presence of key hints
    expect(result).toContain("MOMUS");
    expect(result).toContain("allowance");
    expect(result).toContain("insufficient");
  });
});
