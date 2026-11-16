import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import baseConfig from "./playwright.config.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

/**
 * Responsive / accessibility sweep.
 *
 * Separate from the functional E2E suite so `npm run test:e2e` stays fast
 * while the sweep can be run on demand:
 *
 *   npm run test:responsive
 *
 * The sweep serves the production build (`vite preview`) rather than the dev
 * server. The dev server re-transforms modules on demand, which is slow
 * under parallel load and made the sweep flaky; the built bundle is both
 * faster and closer to what users actually get.
 *
 * `reuseExistingServer` is off so the sweep always tests a freshly built
 * bundle — reusing a server that is already listening would silently test a
 * stale build, which is the exact class of bug this sweep exists to catch.
 * `globalSetup` frees the port first so an interrupted run cannot block it.
 *
 * The port must stay 5173: the backend validates the request `Origin`
 * against `CLIENT_URL` (default http://localhost:5173) and answers 403 for
 * any other origin, which would break every authenticated route.
 */
const SWEEP_PORT = 5173;

export default defineConfig({
  ...baseConfig,
  testDir: "./e2e-responsive",
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  use: {
    ...baseConfig.use,
    baseURL: `http://localhost:${SWEEP_PORT}`,
  },
  webServer: [
    {
      command: "npm start",
      cwd: path.join(repoRoot, "backend"),
      url: "http://localhost:4000/healthz",
      // The sweep owns its backend too. Reusing a leftover one means the
      // sweep can end up talking to a server that dies mid-run and hangs
      // every request.
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run build && npm run preview -- --port ${SWEEP_PORT} --strictPort`,
      cwd: dirname,
      url: `http://localhost:${SWEEP_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
