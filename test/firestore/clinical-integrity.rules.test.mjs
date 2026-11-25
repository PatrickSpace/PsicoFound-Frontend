import fs from "node:fs";
import test from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {addDoc, collection, doc, getDoc, setDoc, updateDoc} from "firebase/firestore";

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

test("clinical resources preserve ownership and role boundaries", {
  skip: !emulatorEnabled,
}, async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  const environment = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || "demo-lurems-rules",
    firestore: {
      host,
      port: Number(port),
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users/patient-1"), {
      id: "patient-1", roles: ["patient"], rol: "patient", accountStatus: "active",
    });
    await setDoc(doc(db, "users/psychologist-1"), {
      id: "psychologist-1", roles: ["psychologist"], rol: "psychologist",
      accountStatus: "active",
    });
    await setDoc(doc(db, "users/disabled-1"), {
      id: "disabled-1", roles: ["patient"], rol: "patient", accountStatus: "disabled",
    });
    await setDoc(doc(db, "therapists/therapist-1"), {
      uid: "psychologist-1", nombre: "Profesional",
    });
    await setDoc(doc(db, "terapias/therapy-1"), {
      usuarioId: "patient-1",
      pacienteUid: "patient-1",
      terapeutaId: "therapist-1",
      estado: "activo",
      citas: [],
      intakeSnapshot: {profileSessionId: "session-1"},
      motivoTerapia: "Motivo",
      detalleTerapia: "",
      objetivosIniciales: [],
      createdAt: new Date(),
      fechaCreacion: new Date().toISOString(),
      updatedAt: new Date(),
    });
    await setDoc(doc(db, "citas/appointment-1"), {
      pacienteUid: "patient-1",
      terapeutaId: "therapist-1",
      terapiaId: "therapy-1",
      estado: "confirmada",
      paymentStatus: "approved",
      bookingId: "booking-1",
      paymentId: "payment-1",
    });
  });

  const patientDb = environment.authenticatedContext("patient-1").firestore();
  const psychologistDb = environment.authenticatedContext("psychologist-1").firestore();
  const disabledDb = environment.authenticatedContext("disabled-1").firestore();

  await assertFails(setDoc(doc(patientDb, "citas/forged"), {
    pacienteUid: "patient-1",
    terapeutaId: "therapist-1",
    terapiaId: "therapy-1",
    estado: "confirmada",
  }));
  await assertFails(updateDoc(doc(patientDb, "citas/appointment-1"), {
    estado: "realizada",
  }));
  await assertFails(updateDoc(doc(psychologistDb, "citas/appointment-1"), {
    meetingProvider: "Google Meet",
    meetingUrl: "https://meet.google.com/example",
    meetingUrlUpdatedAt: new Date(),
  }));

  await assertFails(updateDoc(doc(psychologistDb, "terapias/therapy-1"), {
    citas: [{citaId: "forged", estado: "realizada"}],
  }));
  await assertFails(setDoc(doc(psychologistDb, "therapist_availability/direct"), {
    therapistId: "therapist-1", status: "available",
  }));
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "therapist_availability/private-slot"), {
      therapistId: "therapist-1", status: "booked", bookedBy: "patient-1",
    });
  });
  await assertFails(getDoc(doc(patientDb, "therapist_availability/private-slot")));
  await assertSucceeds(getDoc(doc(psychologistDb, "therapist_availability/private-slot")));
  await assertFails(updateDoc(doc(psychologistDb, "therapist_availability/private-slot"), {
    status: "available",
  }));

  // Domain writes are performed through audited callable operations.
  for (const name of ['therapy_goals', 'exercises', 'emotional_checkins', 'longitudinal_history']) {
    for (const db of [patientDb, psychologistDb, disabledDb]) {
      await assertFails(addDoc(collection(db, name), {
        pacienteUid: 'patient-1', terapeutaId: 'therapist-1', terapiaId: 'therapy-1',
        createdBy: 'patient-1', title: 'Dato sintético', status: 'active',
      }));
    }
  }
  await environment.cleanup();
});
