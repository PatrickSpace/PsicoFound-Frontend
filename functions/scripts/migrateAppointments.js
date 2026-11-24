const admin = require("firebase-admin");
const {migrateAppointments} =
  require("../src/scheduling/migrateLegacyAppointments");

const projectArg = process.argv.find((a) => a.startsWith("--project="));
const projectId = projectArg?.slice(10);
if (!projectId) throw new Error("Indica --project=<id> explícitamente.");
admin.initializeApp({projectId});
const apply = process.argv.includes("--apply");
migrateAppointments(admin.firestore(), {apply})
    .then((totals) => console.log(JSON.stringify(totals)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
