import { defineConfig, devices } from '@playwright/test'

// Home-clip VIDEO machine — records the full 12-moment product story as one continuous real run
// (home-clip-video.spec.ts), the extended sibling of playwright.video.config.ts (core-flow). Shares the
// same login (globalSetup → capture-state.json) and the same stubbed, deterministic backend, so it
// spends no credits. The spec creates its OWN context with recordVideo, so the video settings live in
// the spec; this config only scopes the run to that one spec and reuses the session.
//
// Run (ONE command, per theme):
//   BASE_URL=https://app.indxr.ai CAPTURE_THEME=light NODE_PATH=node_modules/.pnpm/node_modules \
//     node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
//     test --config=playwright.homeclip.config.ts
export default defineConfig({
  testDir: './tests/playwright/capture',
  testMatch: '**/home-clip-video.spec.ts',
  globalSetup: './tests/playwright/capture/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
  },
  timeout: 240_000,
  expect: { timeout: 20_000 },
  projects: [
    { name: 'homeclip', use: { ...devices['Desktop Chrome'] } },
  ],
})
