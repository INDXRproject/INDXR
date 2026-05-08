import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/playwright/specs/cross-host',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'tests/playwright-report/smoke', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL_MARKETING ?? 'https://indxr.ai',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 30_000,
  expect: { timeout: 10_000 },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/playwright/specs/cross-host/.auth.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
})
