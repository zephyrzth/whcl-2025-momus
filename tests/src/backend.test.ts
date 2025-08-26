import { describe, beforeEach, afterEach, it, expect, inject } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PocketIc, type Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";

// Import generated types for your canister
import { idlFactory } from "../../src/declarations/backend/backend.did.js";
import type { _SERVICE } from "../../src/declarations/backend/backend.did.d.ts";

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

    it("should initially have no canvas state for each user", async () => {
      const hasState = await actor.has_canvas_state();
      expect(hasState).toBe(false);

      const state = await actor.get_canvas_state();
      expect(state).toBeNull();
    });

    it("should save and load canvas state per user", async () => {
      // Save state for user 1
      const result = await actor.save_canvas_state(mockCanvasState);
      expect(result).toBe(true);
      const loaded = await actor.get_canvas_state();
      expect(loaded).toEqual(mockCanvasState);
    });

    it("should isolate canvas state between users", async () => {
      // Save state for user 1
      await actor.save_canvas_state(mockCanvasState);
      // Create a second user
  const pic2 = await PocketIc.create(inject("PIC_URL"));
      const fixture2 = await pic2.setupCanister<_SERVICE>({
        idlFactory,
        wasm: WASM_PATH,
      });
      const actor2 = fixture2.actor;
      // User 2 should have no state
      const hasState2 = await actor2.has_canvas_state();
      expect(hasState2).toBe(false);
      const state2 = await actor2.get_canvas_state();
      expect(state2).toBeNull();
      // User 2 saves their own state
      const user2State = { ...mockCanvasState, version: BigInt(2) };
      await actor2.save_canvas_state(user2State);
      const loaded2 = await actor2.get_canvas_state();
      expect(loaded2).toEqual(user2State);
      // User 1's state should remain unchanged
      const loaded1 = await actor.get_canvas_state();
      expect(loaded1).toEqual(mockCanvasState);
      await pic2.tearDown();
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

  // Principal-based authentication tests
  describe("Principal-based Authentication", () => {
    it("should create user profile with display name", async () => {
      const displayName = "Test User";
      const result = await actor.createUserProfile([displayName]);

      expect("ok" in result).toBe(true);
      if ("ok" in result) {
        expect(result.ok.displayName).toEqual([displayName]);
        expect(typeof result.ok.createdAt).toBe("bigint");
        expect(result.ok.principalId).toBeDefined();
      }
    });

    it("should create user profile without display name", async () => {
      const result = await actor.createUserProfile([]);

      expect("ok" in result).toBe(true);
      if ("ok" in result) {
        expect(result.ok.displayName).toEqual([]);
        expect(typeof result.ok.createdAt).toBe("bigint");
        expect(result.ok.principalId).toBeDefined();
      }
    });

    it("should not allow creating duplicate user profile", async () => {
      // Create first profile
      const firstResult = await actor.createUserProfile(["First User"]);
      expect("ok" in firstResult).toBe(true);

      // Try to create second profile with same principal
      const secondResult = await actor.createUserProfile(["Second User"]);
      expect("err" in secondResult).toBe(true);
      if ("err" in secondResult) {
        expect(secondResult.err).toBe("User profile already exists");
      }
    });

    it("should get user profile after creation", async () => {
      const displayName = "Profile Test User";

      // Create profile
      await actor.createUserProfile([displayName]);

      // Get profile
      const result = await actor.getUserProfile();

      expect("ok" in result).toBe(true);
      if ("ok" in result) {
        expect(result.ok.displayName).toEqual([displayName]);
        expect(result.ok.principalId).toBeDefined();
      }
    });

    it("should return error when getting non-existent user profile", async () => {
      const result = await actor.getUserProfile();

      expect("err" in result).toBe(true);
      if ("err" in result) {
        expect(result.err).toBe("User profile not found");
      }
    });

    it("should update user profile display name", async () => {
      const originalName = "Original Name";
      const updatedName = "Updated Name";

      // Create profile
      await actor.createUserProfile([originalName]);

      // Update profile
      const updateResult = await actor.updateUserProfile([updatedName]);

      expect("ok" in updateResult).toBe(true);
      if ("ok" in updateResult) {
        expect(updateResult.ok.displayName).toEqual([updatedName]);
      }

      // Verify update by getting profile
      const getResult = await actor.getUserProfile();
      expect("ok" in getResult).toBe(true);
      if ("ok" in getResult) {
        expect(getResult.ok.displayName).toEqual([updatedName]);
      }
    });

    it("should return error when updating non-existent user profile", async () => {
      const result = await actor.updateUserProfile(["New Name"]);

      expect("err" in result).toBe(true);
      if ("err" in result) {
        expect(result.err).toBe("User profile not found");
      }
    });

    it("should return caller principal from whoami", async () => {
      const principal = await actor.whoami();
      expect(principal).toBeDefined();
  // Basic shape check: string round-trip works
  const asText = principal.toText();
  expect(typeof asText).toBe("string");
    });

    it("should track user count correctly", async () => {
      const initialCount = await actor.getUserCount();

      // Create a user profile
      await actor.createUserProfile(["Test User"]);

      const newCount = await actor.getUserCount();
      expect(newCount).toBe(initialCount + BigInt(1));
    });

    // New execute_prompt tests
    describe("execute_prompt", () => {
      it("should return variant Err until implemented", async () => {
        const res = await actor.execute_prompt("Test prompt");
        expect("err" in res || "Err" in res).toBe(true);
      });

      it("should exist and be callable", async () => {
        // Just ensure the method is exposed in the candid
        const res = await actor.execute_prompt("Hello");
        expect(res).toBeDefined();
      });
    });
  });
});
