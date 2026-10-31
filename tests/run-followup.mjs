import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

assert.match(process.env.FIRESTORE_EMULATOR_HOST || "", /^127\.0\.0\.1:8080$/);
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST || "", /^127\.0\.0\.1:9099$/);
const env = {
  ...process.env, FUNCTIONS_EMULATOR: "true", GCLOUD_PROJECT: "demo-lurems-followup",
  VITE_USE_FIREBASE_EMULATORS: "true", VITE_FIREBASE_PROJECT_ID: "demo-lurems-followup",
  VITE_FIREBASE_API_KEY: "synthetic-only", VITE_FIREBASE_APP_ID: "synthetic-only",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-lurems-followup.firebaseapp.com",
  VITE_LEGAL_DOCUMENT_VERSION: "review-2026-10-06",
  VITE_TERMS_URL: "https://example.test/terms", VITE_PRIVACY_URL: "https://example.test/privacy",
};
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Validation exited ${code}`)));
  });
}
let server;
try {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error("Port 5178 must be free: validation must launch its own isolated frontend")));
    probe.listen(5178, "127.0.0.1", () => probe.close(resolve));
  });
  if (process.env.CARE_GUIDE_VALIDATION) {
    await run(["--test", "tests/patient-care-guide.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.CARE_GUIDE_REVIEW) {
    const { seedPatientCare } = await import('./helpers/patient-care-fixture.mjs');
    await seedPatientCare();
  }
  if (process.env.ADMIN_ONLY) {
    await run(["--test", "tests/admin-pilot.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.SETUP_VALIDATION) {
    await run(["--test", "tests/professional-setup.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.PAYMENT_RULES_ONLY) {
    await run(["--test", "tests/paymentRates.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.PILOT_OPERATIONS_ONLY) {
    await run(["--test", "tests/pilot-operations.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.PILOT_PAYMENTS_ONLY) {
    await run(["--test", "tests/pilot-payments.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.PILOT_SURVEY_ONLY) {
    await run(["--test", "tests/pilot-survey.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.PILOT_ACCOUNTS_ONLY) {
    await run(["--test", "tests/pilot-accounts.integration.test.mjs"]);
    await run(["--test", "tests/account-inactivity.integration.test.mjs"]);
    process.exit(0);
  }
  if (process.env.LEGAL_VALIDATION) await run(["--test", "tests/legal-documents.integration.test.mjs"]);
  if (!process.env.CARE_GUIDE_REVIEW && !process.env.LEGAL_VALIDATION && !process.env.PILOT_BROWSER_ONLY && !process.env.PAYMENT_DEADLINE_ONLY && !process.env.ADMIN_BROWSER_ONLY) {
  await run(["--test", "tests/followup.integration.test.mjs"]);
  await run(["--test", "tests/appointments.integration.test.mjs"]);
  await run(["--test", "tests/professional-setup.integration.test.mjs"]);
  if (process.env.PILOT_VALIDATION) {
    await run(["--test", "tests/admin-pilot.integration.test.mjs"]);
    await run(["--test", "tests/legal-documents.integration.test.mjs"]);
    await run(["--test", "tests/pilot-operations.integration.test.mjs"]);
    await run(["--test", "tests/paymentRates.integration.test.mjs"]);
    await run(["--test", "tests/pilot-payments.integration.test.mjs"]);
    await run(["--test", "tests/pilot-accounts.integration.test.mjs"]);
    await run(["--test", "tests/account-inactivity.integration.test.mjs"]);
    await run(["--test", "tests/pilot-survey.integration.test.mjs"]);
  }
  if (process.env.PATIENT_VALIDATION) await run(["--test", "tests/patient.integration.test.mjs"]);
  if (process.env.AGENDA_VALIDATION) await run(["--test", "tests/agenda.integration.test.mjs"]);
  }
  if (process.env.PILOT_INTEGRATION_ONLY) process.exit(0);
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5178", "--strictPort"], { env, stdio: "inherit" });
  let ready = false;
  for (let attempts = 0; attempts < 40; attempts++) {
    if (server.exitCode !== null) throw new Error("The isolated frontend could not start");
    try { if ((await fetch("http://127.0.0.1:5178")).ok) { ready = true; break; } } catch { /* Wait for local Vite. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("The isolated frontend did not become ready");
  if (process.env.CARE_GUIDE_REVIEW) {
    console.log('CARE GUIDE DEMO ready on http://127.0.0.1:5178; synthetic data only. Ctrl-C to stop.');
    await new Promise(resolve => process.once('SIGTERM', resolve));
    process.exit(0);
  }
  if (process.env.AGENDA_VALIDATION && !process.env.PAYMENT_DEADLINE_ONLY && !process.env.ADMIN_BROWSER_ONLY) await run(["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.lima.config.js"]);
  await run(["node_modules/@playwright/test/cli.js", "test", ...(process.env.VALIDATION_GREP ? ["--grep", process.env.VALIDATION_GREP] : []), ...(process.env.LEGAL_VALIDATION ? ["tests/browser/legal-documents.spec.mjs"] : process.env.ADMIN_BROWSER_ONLY ? ["tests/browser/admin-pilot.spec.mjs"] : process.env.PAYMENT_DEADLINE_ONLY ? ["tests/browser/payment-deadline.spec.mjs"] : [])]);
} finally {
  server?.kill("SIGTERM");
}
