import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  timeout: 300000,
  expect: { timeout: 60000 },
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3002', channel: 'msedge', headless: true, viewport: { width: 1440, height: 1050 }, launchOptions: { args: ['--enable-webgl', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:3002', reuseExistingServer: !process.env.CI },
})
