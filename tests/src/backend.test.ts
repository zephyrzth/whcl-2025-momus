import { describe, beforeEach, afterEach, it, expect, inject } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PocketIc, type Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";

// Import generated types for your canister
import {
  type _SERVICE,
  idlFactory,
} from "../../src/declarations/backend/backend.did.js";

// Define the path to your canister's WASM file
export const WASM_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".dfx",
  "local",
  "canisters",
  "backend",
  "backend.wasm",
);

// The `describe` function is used to group tests together
describe("Vibe Coding Template Backend", () => {
  // Define variables to hold our PocketIC instance, canister ID,
  // and an actor to interact with our canister.
  let pic: PocketIc;
  // @ts-ignore - This variable is used in the setup / framework
  let canisterId: Principal;
  let actor: Actor<_SERVICE>;

  // The `beforeEach` hook runs before each test.
  beforeEach(async () => {
    // create a new PocketIC instance
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

  // The `afterEach` hook runs after each test.
  afterEach(async () => {
    // tear down the PocketIC instance
    await pic.tearDown();
  });

  // The `it` function is used to define individual tests
  it("should greet with the provided name", async () => {
    const response = await actor.greet("World");
    expect(response).toEqual("Hello, World!");
  });

  it("should increment counter and return new value", async () => {
    const initialCount = await actor.get_count();
    const newCount = await actor.increment();
    expect(newCount).toEqual(initialCount + BigInt(1));
  });

  it("should get current counter value", async () => {
    const count = await actor.get_count();
    expect(typeof count).toBe("bigint");
  });

  it("should set counter to specified value", async () => {
    const newValue = BigInt(42);
    const result = await actor.set_count(newValue);
    expect(result).toEqual(newValue);
    const currentCount = await actor.get_count();
    expect(currentCount).toEqual(newValue);
  });

  // Canvas state management tests
  describe("Canvas State Management", () => {
    const mockCanvasState = {
      nodes: [
        {
          id: "node-1",
          nodeType: "weatherAgent",
          position: { x: 100.0, y: 200.0 },
          agentLabel: "Weather Agent",
          attributes: [
            ["city", "Jakarta"],
            ["units", "metric"],
          ] as [string, string][],
        },
        {
          id: "node-2",
          nodeType: "clientAgent",
          position: { x: 300.0, y: 150.0 },
          agentLabel: "Client Agent",
          attributes: [["endpoint", "api/data"]] as [string, string][],
        },
      ],
      connections: [
        {
          id: "connection-1",
          source: "node-1",
          target: "node-2",
          connectionType: "data",
        },
      ],
      lastUpdated: "2025-01-15T10:30:00Z",
      version: BigInt(1),
    };

    it("should initially have no canvas state", async () => {
      const hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      const state = await actor.get_canvas_state();
      expect(state).toEqual([]);
    });

    it("should save canvas state and return true", async () => {
      const result = await actor.save_canvas_state(mockCanvasState);
      expect(result).toBe(true);
    });

    it("should load saved canvas state", async () => {
      // First save the state
      await actor.save_canvas_state(mockCanvasState);

      // Then load it
      const loadedState = await actor.get_canvas_state();
      expect(loadedState).toEqual([mockCanvasState]);
    });

    it("should indicate canvas has state after saving", async () => {
      // Initially no state
      let hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      // Save state
      await actor.save_canvas_state(mockCanvasState);

      // Now should have state
      hasState = await actor.has_canvas_state();
      expect(hasState).toBe(true);
    });

    it("should clear canvas state and return true", async () => {
      // First save some state
      await actor.save_canvas_state(mockCanvasState);

      // Verify it exists
      let hasState = await actor.has_canvas_state();
      expect(hasState).toBe(true);

      // Clear the state
      const result = await actor.clear_canvas_state();
      expect(result).toBe(true);

      // Verify it's cleared
      hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      const state = await actor.get_canvas_state();
      expect(state).toEqual([]);
    });

    it("should handle empty nodes and connections arrays", async () => {
      const emptyState = {
        nodes: [],
        connections: [],
        lastUpdated: "2025-01-15T10:30:00Z",
        version: BigInt(1),
      };

      const result = await actor.save_canvas_state(emptyState);
      expect(result).toBe(true);

      const loadedState = await actor.get_canvas_state();
      expect(loadedState).toEqual([emptyState]);
    });

    it("should preserve complex agent attributes", async () => {
      const complexState = {
        nodes: [
          {
            id: "complex-node",
            nodeType: "advancedAgent",
            position: { x: 500.5, y: 750.25 },
            agentLabel: "Advanced AI Agent",
            attributes: [
              ["model", "gpt-4"],
              ["temperature", "0.7"],
              ["maxTokens", "2048"],
              ["systemPrompt", "You are a helpful assistant"],
              ["apiKey", "encrypted-key-123"],
            ] as [string, string][],
          },
        ],
        connections: [
          {
            id: "complex-connection",
            source: "complex-node",
            target: "output-node",
            connectionType: "streaming",
          },
        ],
        lastUpdated: "2025-01-15T15:45:30Z",
        version: BigInt(5),
      };

      await actor.save_canvas_state(complexState);
      const loadedState = await actor.get_canvas_state();
      expect(loadedState).toEqual([complexState]);
    });
  });
});
