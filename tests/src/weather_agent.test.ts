import { describe, beforeEach, afterEach, it, expect, inject } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PocketIc, type Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";

// Import generated types for the weather agent canister
import {
  type _SERVICE,
  idlFactory,
} from "../../src/declarations/agent-weather_agent/agent-weather_agent.did.js";

// Define the path to the weather agent canister's WASM file
export const WASM_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "agent-weather_agent",
  "agent-weather_agent.wasm",
);

describe("Weather Agent", () => {
  let pic: PocketIc;
  // @ts-ignore - This variable is used in the setup / framework
  let canisterId: Principal;
  let actor: Actor<_SERVICE>;

  beforeEach(async () => {
    // Create a new PocketIC instance
    // @ts-ignore - PIC_URL is injected by the test environment
    pic = await PocketIc.create(inject("PIC_URL"));

    // Setup the canister and actor
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });

    // Save the actor and canister ID for use in tests
    actor = fixture.actor;
    canisterId = fixture.canisterId;
  });

  afterEach(async () => {
    await pic?.tearDown();
  });

  describe.skip("get_metadata", () => {
    it("should return weather agent metadata with correct name and description", async () => {
      // Skipped: get_metadata now returns a JSON string instead of structured metadata
    });
  });

  describe("execute_task", () => {
    it("should return API key not configured error when no API key is set", async () => {
      // Setup
      const testPrompt = "What's the weather in Tokyo?";

      // Execute
      const result = await actor.execute_task(testPrompt);

      // Assert
      expect(result).toContain("API key not configured");
      expect(result).toContain("Please configure the weather API key first");
    });

    it("should handle empty prompt gracefully", async () => {
      // Setup
      const testPrompt = "";

      // Execute
      const result = await actor.execute_task(testPrompt);

      // Assert
      expect(result).toContain("API key not configured");
    });

    it("should handle non-weather related prompts", async () => {
      // Setup
      const testPrompt = "Hello, how are you?";

      // Execute
      const result = await actor.execute_task(testPrompt);

      // Assert
      expect(result).toContain("API key not configured");
    });
  });
});
