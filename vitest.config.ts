import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.worktrees/**"],
    hookTimeout: 120_000,
    testTimeout: 120_000,
  },
});
