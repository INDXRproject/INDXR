import { defineConfig, devices } from '@playwright/test'

// Docs-screenshot capture machine — SEPARATE from the 9 functional specs.
// Run explicitly:  BASE_URL=http://localhost:3001 npx playwright test --config=playwright.capture.config.ts
// The default `npx playwright test` uses playwright.config.ts (testDir=specs) and never
// picks this up (different testDir), so the 9 specs are neither slowed nor broken.
export default defineConfig({
  testDir: './tests/playwright/capture',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  timeout: 120_000,
  expect: { timeout: 15_000 },
  projects: [
    {
      name: 'capture',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
      },
    },
  ],
})
