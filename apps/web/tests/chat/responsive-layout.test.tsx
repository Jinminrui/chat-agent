import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("design tokens", () => {
  it("defines the app background, sidebar background, and accent color in shadcn/ui theme", () => {
    const css = readFileSync("app/globals.css", "utf8");

    // 背景色映射到 --background (oklch 格式)
    expect(css).toContain("--background:");
    expect(css).toContain("#1a1a1a");
    // 侧边栏背景色映射到 --sidebar (oklch 格式)
    expect(css).toContain("--sidebar:");
    expect(css).toContain("#1c1c1c");
    // 主色调映射到 --primary (oklch 格式)
    expect(css).toContain("--primary:");
    expect(css).toContain("#f2f2f2");
  });
});
