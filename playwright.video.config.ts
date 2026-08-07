import { defineConfig, devices } from '@playwright/test'

// Video-recording machine — the moving sibling of playwright.capture.config.ts (the still-screenshot
// machine). Shares the same login (globalSetup mints account1 into capture-state.json) and the same
// fixture, but records a WebM of the real product driving the core flow, with a stubbed backend so the
// run is deterministic and spends no credits. See docs/wiki/content/screenshot-machine.md » Recording standard.
//
// Run (ONE command):
//   BASE_URL=https://app.indxr.ai NODE_PATH=node_modules/.pnpm/node_modules \
//     node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
//     test --config=playwright.video.config.ts
//
// The spec creates its OWN context with recordVideo (so it controls close + saveAs), so the video
// settings live in the spec, not here. This config only scopes the run to the video spec + reuses the
// session. The still-capture config (testMatch quickstart-capture) never picks this spec up.
export default defineConfig({
  testDir: './tests/playwright/capture',
  testMatch: '**/core-flow-video.spec.ts',
  globalSetup: './tests/playwright/capture/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
  },
  timeout: 180_000,
  expect: { timeout: 20_000 },
  projects: [
    { name: 'video', use: { ...devices['Desktop Chrome'] } },
  ],
})
