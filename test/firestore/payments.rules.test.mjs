import fs from "node:fs";
import test from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

test("financial documents remain server-only", {
  skip: !emulatorEnabled,
}, async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  const environment = await initializeTestEnvironment({
    projectId: "lurems-rules-test",
    firestore: {
      host,
      port: Number(port),
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/patient-1"), {
      id: "patient-1",
      roles: ["patient"],
      rol: "patient",
    });
    await setDoc(doc(db, "bookings/booking-1"), {
      patientId: "patient-1",
      psychologistUid: "psychologist-1",
    });
    await setDoc(doc(db, "payments/payment-1"), {patientId: "patient-1"});
    await setDoc(doc(db, "ledger_entries/entry-1"), {paymentId: "payment-1"});
    await setDoc(doc(db, "therapist_availability/slot-1"), {
      therapistId: "therapist-1",
      status: "available",
    });
  });
  const patientDb = environment.authenticatedContext("patient-1").firestore();
  await assertSucceeds(getDoc(doc(patientDb, "bookings/booking-1")));
  await assertFails(getDoc(doc(patientDb, "payments/payment-1")));
  await assertFails(getDoc(doc(patientDb, "ledger_entries/entry-1")));
  await assertFails(updateDoc(doc(patientDb, "therapist_availability/slot-1"), {
    status: "held",
    heldBy: "patient-1",
  }));
  await environment.cleanup();
});
