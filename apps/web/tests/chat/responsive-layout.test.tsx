import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("design tokens", () => {
  it("defines the app background, sidebar background, and accent color", () => {
    const css = readFileSync("styles/tokens.css", "utf8");

    expect(css).toContain("--bg-app: #f6f3ee;");
    expect(css).toContain("--bg-sidebar: #efe9e1;");
    expect(css).toContain("--accent-primary: #355d52;");
  });
});
