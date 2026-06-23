import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));

describe("prisma schema", () => {
  it("contains user, conversation, message, and tool call models", () => {
    const schema = readFileSync(
      resolve(currentDir, "../../../..", "prisma/schema.prisma"),
      "utf8",
    );

    expect(schema).toContain('provider = "prisma-client-js"');
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain("model User");
    expect(schema).toContain("model Conversation");
    expect(schema).toContain("model Message");
    expect(schema).toContain("model ToolCall");
  });
});
