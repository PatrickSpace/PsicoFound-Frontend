import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  testIgnore: "agenda-lima.spec.mjs",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { outputFolder: "test-results/followup-report", open: "never" }]],
  outputDir: "test-results/followup",
  use: { launchOptions: { chromiumSandbox: process.platform === "linux" }, baseURL: "http://127.0.0.1:5178", actionTimeout: 15000, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
});
