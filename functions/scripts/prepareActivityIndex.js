/* eslint-disable max-len */
// Explicit operator tool. Default is read-only; never run automatically at deploy.
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldPath} = require("firebase-admin/firestore");
const {activityIndexPatch, normalizeActivityIndex} = require("../src/accounts/accountLifecycle");

async function prepareActivityIndex(db, {apply = false, after = "", pages = 1} = {}) {
  const counts = {scanned: 0, pending: 0, cursor: after, done: false};
  for (let pageNumber = 0; pageNumber < pages; pageNumber++) {
    let query = db.collection("users").orderBy(FieldPath.documentId()).limit(200);
    if (counts.cursor) query = query.startAfter(counts.cursor);
    const page = await query.get();
    for (const snapshot of page.docs) {
      counts.scanned++;
      if (Object.keys(activityIndexPatch(snapshot.data())).length) {
        counts.pending++;
        // Re-read transactionally: do not overwrite concurrent app activity.
        if (apply) await normalizeActivityIndex(db, snapshot.ref);
      }
    }
    if (page.size < 200) {
      counts.done = true;
      counts.cursor = null;
      break;
    }
    counts.cursor = page.docs.at(-1).id;
  }
  return counts;
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const allowed = new Set(["--project", "--after", "--pages", "--apply"]);
    const options = {};
    while (args.length) {
      const key = args.shift();
      if (!allowed.has(key)) throw Error("Unknown argument");
      if (key === "--apply") options.apply = true;
      else {
        const value = args.shift();
        if (!value || value.startsWith("--")) throw Error("Missing argument value");
        options[key.slice(2)] = value;
      }
    }
    if (!/^[a-z][a-z0-9-]{4,60}$/.test(options.project || "")) throw Error("Explicit --project required");
    options.pages = Number(options.pages || 1);
    if (!Number.isSafeInteger(options.pages) || options.pages < 1) throw Error("Invalid --pages");
    if (options.project.startsWith("demo-") && !process.env.FIRESTORE_EMULATOR_HOST) throw Error("Demo project requires emulator");
    initializeApp({projectId: options.project});
    const counts = await prepareActivityIndex(getFirestore(), options);
    process.stdout.write(`${JSON.stringify({apply: Boolean(options.apply), ...counts})}\n`);
  })().catch(() => {
    process.stderr.write("Preparation failed; check arguments/credentials and resume from the last completed cursor.\n");
    process.exitCode = 1;
  });
}
module.exports = {prepareActivityIndex};
