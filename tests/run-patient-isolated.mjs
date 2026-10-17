import { syntheticEligibility, syntheticPrivacy, syntheticCommercial } from "./helpers/pilot-policy.mjs";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn, execFileSync } from "node:child_process";

assert.ok(!process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST,
  "Run outside existing emulators: never reset another chat's database");
assert.ok(!process.env.NODE_OPTIONS, "Run without preloads or compatibility patches");
// Fail closed before Firebase is started; never reuse a listening service.
for (const port of [8080, 9099, 5001, 5178, 4400, 4500, 9150]) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`Port ${port} is occupied; stop without touching it`)));
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
const args = ["emulators:exec", "--config", "firebase.followup-test.json",
  "--only", "auth,firestore,functions", "--project", "demo-lurems-followup", "node tests/run-followup.mjs"],
  env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "JAVA_HOME", "LANG", "LC_ALL", "CI", "PLAYWRIGHT_BROWSERS_PATH",
      "AGENDA_VALIDATION", "PILOT_VALIDATION", "PILOT_ACCOUNTS_ONLY", "PILOT_SURVEY_ONLY", "PILOT_PAYMENTS_ONLY", "PILOT_OPERATIONS_ONLY", "PAYMENT_RULES_ONLY", "PILOT_BROWSER_ONLY", "PILOT_INTEGRATION_ONLY", "PAYMENT_DEADLINE_ONLY", "ADMIN_ONLY", "ADMIN_BROWSER_ONLY", "VALIDATION_GREP", "LEGAL_VALIDATION"].includes(key))),
    PATIENT_VALIDATION: "true", FIREBASE_CLI_DISABLE_MOTD: "true", FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
    ELIGIBILITY_POLICY_JSON: JSON.stringify(syntheticEligibility),
    CHAT_LIMITS_JSON: JSON.stringify({version: "synthetic-limits-v1", requestsPerDay: 40, globalConcurrency: 4}),
    COMMERCIAL_POLICY_JSON: JSON.stringify(syntheticCommercial),
    PRIVACY_POLICY_JSON: JSON.stringify(syntheticPrivacy),
    LEGAL_DOCUMENT_VERSION: "review-2026-10-06",
    LEGAL_TERMS_URL: "https://example.test/terms",
    LEGAL_PRIVACY_URL: "https://example.test/privacy" };
// OS-level egress restriction applies to CLI, Functions, Node and Chromium.
// Linux requires a fresh network namespace; never weaken this to a fetch mock.
assert.ok(["darwin", "linux"].includes(process.platform), "No verified network isolation for this platform");
const profile = '(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote ip "localhost:*") (remote unix-socket))';
console.log("Isolated validation: all seven ports free; demo-lurems-followup; no NODE_OPTIONS; loopback/Unix-socket egress only.");
let command, commandArgs;
if (process.platform === "darwin") {
  command = "/usr/bin/sandbox-exec"; commandArgs = ["-p", profile, "firebase", ...args];
} else {
  assert.ok(process.getuid() > 0, "Start as a non-root user; only namespace initialization uses sudo");
  const firebase = execFileSync("which", ["firebase"], {encoding: "utf8"}).trim();
  const unshare = execFileSync("which", ["unshare"], {encoding: "utf8"}).trim();
  command = "sudo";
  commandArgs = ["-n", "--", "env", "-i", ...Object.entries(env).map(([key,value]) => `${key}=${value}`),
    unshare, "--net", "--", process.execPath, "tests/linux-network-child.mjs",
    String(process.getuid()), String(process.getgid()), firebase, ...args];
}
const child = spawn(command, commandArgs, { stdio: "inherit", env, detached: true });
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
let interrupted = false;
child.on("exit", (code, signal) => { process.exitCode = interrupted || signal ? 130 : (code ?? 1); });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { interrupted = true; process.kill(-child.pid, signal); });
