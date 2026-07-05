import { describe, expect, it } from "vitest";
import { createToolRegistry } from "../../src/modules/tools/tool-registry";

describe("tool registry", () => {
  it("returns registered tool definitions", () => {
    const registry = createToolRegistry({
      "current-time": {
        definition: {
          name: "current-time",
          description: "Return the current server time.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        handler: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
    });

    expect(registry.definitions()).toEqual([
      {
        name: "current-time",
        description: "Return the current server time.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    ]);
  });

  it("only treats own properties as registered tools", () => {
    const registry = createToolRegistry({
      "current-time": {
        definition: {
          name: "current-time",
          description: "Return the current server time.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        handler: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
    });

    expect(registry.has("current-time")).toBe(true);
    expect(registry.has("toString")).toBe(false);
    expect(registry.has("constructor")).toBe(false);
  });
});
