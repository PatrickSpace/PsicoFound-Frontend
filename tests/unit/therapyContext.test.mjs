import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequestGate, formatTherapyDate, itemsForContext, therapyLabel } from "../../src/utils/therapyContext.js";

test("therapy labels distinguish dates without losing patient, id or status", () => {
  const therapy = { id: "process-one", pacienteNombre: "Paciente B", estado: "pausa", fechaCreacion: "2026-08-01T12:00:00.000Z" };
  assert.equal(therapyLabel(therapy), "Paciente B · process-one · pausa · Creación: 1/8/2026");
  assert.match(therapyLabel({ ...therapy, id: "process-two", fechaCreacion: "2026-06-11T12:00:00.000Z" }), /process-two · pausa · Creación: 11\/6\/2026$/);
});

test("therapy date formatting supports existing ISO, Date and Firestore Timestamp values", () => {
  const date = new Date("2026-08-01T12:00:00.000Z");
  for (const value of [date.toISOString(), date, { toDate: () => date }]) {
    assert.equal(formatTherapyDate(value, { dateOnly: true }), "1/8/2026");
    assert.equal(formatTherapyDate(value), date.toLocaleString("es-PE"));
  }
});

test("missing or invalid therapy dates stay explicitly unavailable", () => {
  for (const fechaCreacion of [undefined, null, "", false, true, "not-a-date", "2026-02-30", "2026-13-01", new Date(NaN), { toDate: () => null }, { toDate: () => { throw new Error("Invalid timestamp"); } }]) {
    assert.equal(formatTherapyDate(fechaCreacion), "Fecha no disponible");
    assert.match(therapyLabel({ id: "legacy", estado: "pausa", fechaCreacion }), /legacy · pausa · Creación: Fecha no disponible$/);
  }
});

test("late loads are invalid after a view change or refresh", async () => {
  const gate = createRequestGate();
  const professional = gate.next();
  const patient = gate.next();
  assert.equal(gate.isCurrent(professional), false);
  assert.equal(gate.isCurrent(patient), true);
  gate.next();
  assert.equal(gate.isCurrent(patient), false);
});

test("dual-role data is separated and inconsistent patient/therapy pairs are discarded", () => {
  const professional = { id: "b", pacienteUid: "B", terapeutaId: "TA" };
  const personal = { id: "a", pacienteUid: "A", terapeutaId: "TD" };
  const items = [
    { id: "professional", terapiaId: "b", pacienteUid: "B", terapeutaId: "TA" },
    { id: "personal", terapiaId: "a", pacienteUid: "A", terapeutaId: "TD" },
    { id: "mismatched", terapiaId: "b", pacienteUid: "C", terapeutaId: "TA" },
    { id: "wrong-professional", terapiaId: "b", pacienteUid: "B", terapeutaId: "TD" },
  ];
  assert.deepEqual(itemsForContext(items, [professional], "psychologist", "A").map((i) => i.id), ["professional"]);
  assert.deepEqual(itemsForContext(items, [personal], "patient", "A").map((i) => i.id), ["personal"]);
  assert.deepEqual(itemsForContext(items, [professional], "patient", "A"), []);
});
