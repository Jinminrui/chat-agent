import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/backend/tests/**/*.test.{ts,tsx}",
      "packages/shared/tests/**/*.test.{ts,tsx}",
    ],
  },
});
