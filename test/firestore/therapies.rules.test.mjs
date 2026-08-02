import fs from "node:fs";
import test from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc } from "firebase/firestore";

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

test("therapy intake is immutable and clinical fields are role protected", {
  skip: !emulatorEnabled,
}, async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  const environment = await initializeTestEnvironment({
    projectId: "lurems-therapy-rules-test",
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
    await setDoc(doc(db, "users/psychologist-1"), {
      id: "psychologist-1",
      roles: ["psychologist"],
      rol: "psychologist",
    });
    await setDoc(doc(db, "users/admin-1"), {
      id: "admin-1",
      roles: ["admin"],
      rol: "admin",
    });
    await setDoc(doc(db, "therapists/therapist-1"), {
      uid: "psychologist-1",
      nombre: "Psicóloga",
    });
    await setDoc(doc(db, "terapias/therapy-1"), {
      usuarioId: "patient-1",
      pacienteUid: "patient-1",
      terapeutaId: "therapist-1",
      estado: "activo",
      citas: [],
      intakeSnapshot: {
        profileSessionId: "session-1",
        motivoConsulta: "Ansiedad",
      },
      motivoTerapia: "Ansiedad",
      detalleTerapia: "",
      objetivosIniciales: [],
      fechaCreacion: "2026-08-02T00:00:00.000Z",
      createdAt: new Date("2026-08-02T00:00:00.000Z"),
      updatedAt: new Date("2026-08-02T00:00:00.000Z"),
    });
  });

  const patientDb = environment.authenticatedContext("patient-1").firestore();
  const psychologistDb = environment.authenticatedContext("psychologist-1").firestore();
  const adminDb = environment.authenticatedContext("admin-1").firestore();
  const patientTherapy = doc(patientDb, "terapias/therapy-1");

  await assertSucceeds(updateDoc(patientTherapy, {
    estado: "pausa",
    updatedAt: new Date(),
  }));
  await assertFails(updateDoc(patientTherapy, {
    motivoTerapia: "Alterado por paciente",
    updatedAt: new Date(),
  }));
  await assertFails(updateDoc(patientTherapy, {
    "intakeSnapshot.motivoConsulta": "Perfil reescrito",
    updatedAt: new Date(),
  }));

  await assertSucceeds(updateDoc(doc(psychologistDb, "terapias/therapy-1"), {
    motivoTerapia: "Motivo validado por profesional",
    detalleTerapia: "Detalle clínico inicial",
    objetivosIniciales: ["Mejorar regulación emocional"],
    updatedAt: new Date(),
  }));
  await assertFails(updateDoc(doc(psychologistDb, "terapias/therapy-1"), {
    "intakeSnapshot.motivoConsulta": "Perfil reescrito",
    updatedAt: new Date(),
  }));

  await assertSucceeds(updateDoc(doc(adminDb, "terapias/therapy-1"), {
    detalleTerapia: "Detalle revisado por administración",
    updatedAt: new Date(),
  }));

  await assertFails(setDoc(doc(patientDb, "terapias/direct-create"), {
    pacienteUid: "patient-1",
    terapeutaId: "therapist-1",
    estado: "activo",
  }));

  await environment.cleanup();
});
