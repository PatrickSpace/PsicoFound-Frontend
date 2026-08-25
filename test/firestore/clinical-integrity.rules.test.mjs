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
    projectId: "lurems-clinical-rules-test",
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
  await assertSucceeds(updateDoc(doc(psychologistDb, "citas/appointment-1"), {
    meetingProvider: "Google Meet",
    meetingUrl: "https://meet.google.com/example",
    meetingUrlUpdatedAt: new Date(),
  }));

  const goal = await assertSucceeds(addDoc(collection(patientDb, "therapy_goals"), {
    pacienteUid: "patient-1",
    terapeutaId: "therapist-1",
    terapiaId: "therapy-1",
    title: "Objetivo",
    description: "",
    category: "Proceso terapéutico",
    targetDate: "",
    progress: 0,
    status: "active",
    createdBy: "patient-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await assertSucceeds(updateDoc(goal, {
    progress: 50,
    status: "active",
    lastNote: "Avance",
    achievedAt: "",
    updatedAt: new Date(),
  }));
  await assertFails(updateDoc(goal, {title: "Objetivo alterado"}));

  const exercise = await assertSucceeds(addDoc(collection(psychologistDb, "exercises"), {
    pacienteUid: "patient-1",
    terapeutaId: "therapist-1",
    terapiaId: "therapy-1",
    title: "Respiración",
    instructions: "Practicar",
    category: "Seguimiento",
    frequency: "Diaria",
    dueDate: "",
    status: "assigned",
    patientNotes: "",
    createdBy: "psychologist-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await assertSucceeds(updateDoc(doc(patientDb, "exercises", exercise.id), {
    status: "completed",
    patientNotes: "Completado",
    completedAt: new Date().toISOString(),
    updatedAt: new Date(),
  }));
  await assertFails(updateDoc(doc(patientDb, "exercises", exercise.id), {
    instructions: "Alteradas",
  }));

  await assertSucceeds(addDoc(collection(patientDb, "emotional_checkins"), {
    pacienteUid: "patient-1",
    terapeutaId: "therapist-1",
    terapiaId: "therapy-1",
    mood: "tranquilo",
    intensity: 5,
    energy: 6,
    sleepQuality: 7,
    createdBy: "patient-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await assertFails(addDoc(collection(patientDb, "emotional_checkins"), {
    pacienteUid: "patient-1",
    terapeutaId: "therapist-1",
    terapiaId: "therapy-1",
    mood: "tranquilo",
    intensity: 99,
    energy: 6,
    sleepQuality: 7,
    createdBy: "patient-1",
  }));

  await assertFails(getDoc(doc(disabledDb, "users/disabled-1")));
  await environment.cleanup();
});
