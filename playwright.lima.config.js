import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser", testMatch: "agenda-lima.spec.mjs", workers: 1,
  timeout: 120000, expect: { timeout: 15000 },
  reporter: [["list"], ["html", {outputFolder: "test-results/lima-report", open: "never"}]],
  outputDir: "test-results/lima-browser",
  use: {launchOptions: {chromiumSandbox: process.platform === "linux"}, baseURL: "http://127.0.0.1:5178", actionTimeout: 15000, trace: "retain-on-failure", screenshot: "only-on-failure"},
  projects: ["America/Lima", "Europe/Madrid", "Asia/Tokyo", "Pacific/Honolulu"].flatMap(timezoneId => [
    {name: `${timezoneId.replaceAll("/", "-")}-desktop`, use: {timezoneId, viewport: {width: 1440, height: 1000}}},
    {name: `${timezoneId.replaceAll("/", "-")}-mobile`, use: {...devices["iPhone 13"], defaultBrowserType: "chromium", timezoneId}},
  ]),
});
