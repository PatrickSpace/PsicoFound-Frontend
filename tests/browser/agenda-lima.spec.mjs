import { test, expect } from "@playwright/test";
import { seedPatient } from "../helpers/patient-http.mjs";
import { accounts, password } from "../helpers/followup-fixtures.mjs";
import { adminFirestore } from "../helpers/admin-sdk.mjs";
let db;
test.beforeEach(async ({context}) => {
  db = adminFirestore.getFirestore(await seedPatient());
  await db.doc("users/review-admin").update({onboardingStatus: "complete"});
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) && !url.pathname.endsWith("/sendProfileChatMessage")
      ? route.continue() : route.abort();
  });
});
async function login(page, who = "B", target = "/sesiones") {
  await page.goto("/login");
  await page.getByRole("textbox", {name: "Correo", exact: true}).fill(`${accounts[who]?.uid || who}@example.test`);
  await page.getByRole("textbox", {name: "Contraseña", exact: true}).fill(password);
  await page.getByRole("button", {name: "Iniciar Sesión", exact: true}).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto(target);
}
async function logout(page) {
  await page.goto("/configuracion");
  await page.getByRole("button", {name: "Cerrar sesión", exact: true}).click();
  await expect(page).toHaveURL(/\/login/);
}
async function seed(id, date, startTime, extra = {}) {
  await db.doc(`therapist_availability/${id}`).set({therapistId: "therapist-a", date, startTime,
    durationMinutes: 60, timeZone: "America/Lima", status: "available", modality: "Remoto", location: "Terapia Online", ...extra});
}
test("REV-PAC-04B: full Lima cycle, all roles and preserved legacy slot", async ({page}, info) => {
  await page.clock.setFixedTime(new Date("2099-01-16T00:30:00Z"));
  await login(page, "A", "/psicologo/sesiones");
  await page.getByRole("button", {name: "Abrir bloque", exact: true}).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fecha (hora de Lima)", {exact: true}).fill("2099-01-15");
  await dialog.getByLabel("Hora de inicio (Lima)", {exact: true}).fill("23:30");
  await dialog.getByRole("button", {name: "Abrir bloque", exact: true}).click();
  await expect(dialog).toHaveCount(0);
  const slots = await db.collection("therapist_availability").get();
  const opened = slots.docs.find(d => d.data().startTime === "23:30");
  expect(opened.data().startAtIso).toBe("2099-01-16T04:30:00.000Z");
  expect(opened.data().location).toBe("Terapia Online");
  await seed("past-browser", "2099-01-15", "18:00");
  await db.doc("therapist_availability/legacy-madrid").set({therapistId: "therapist-a",
    date: "2099-01-16", startTime: "04:00", timezone: "Europe/Madrid",
    startAtIso: "2099-01-16T03:00:00.000Z", status: "available", modality: "Remoto", location: "Terapia Online"});
  await logout(page);
  await login(page);
  await page.getByRole("button", {name: "Agendar", exact: true}).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", {name: "18:00 · hora de Lima", exact: true})).toHaveCount(0);
  for (const range of ["Esta semana", "Este mes"]) {
    await dialog.getByRole("button", {name: range, exact: true}).click();
    await expect(dialog.getByRole("button", {name: "23:30 · hora de Lima", exact: true})).toBeVisible();
    await expect(dialog.getByRole("button", {name: "22:00 · hora de Lima", exact: true})).toBeVisible();
  }
  await dialog.getByRole("button", {name: "23:30 · hora de Lima", exact: true}).click();
  await dialog.getByRole("button", {name: "Revisar cotización", exact: true}).click();
  await expect(dialog.getByTestId("booking-quote-schedule")).toContainText("2099-01-15 · 23:30 · hora de Lima");
  await page.screenshot({path: info.outputPath("lima-quote.png"), fullPage: true});
  await dialog.getByRole("button", {name: "Confirmar reserva", exact: true}).click();
  await expect(dialog).toHaveCount(0);
  const appointment = (await db.collection("citas").where("availabilitySlotId", "==", opened.id).get()).docs[0];
  expect(appointment.data().startAtIso).toBe("2099-01-16T04:30:00.000Z");
  await logout(page);
  await login(page, "A", "/psicologo/sesiones");
  const row = page.getByRole("row").filter({hasText: "23:30"});
  await expect(row).toContainText("2099-01-15");
  await row.getByRole("button", {name: "Confirmar cita", exact: true}).click();
  await expect(row).toContainText("confirmada");
  await logout(page);
  await login(page, "review-admin", "/terapiadetail?id=b-active");
  await expect(page).not.toHaveURL(/terapiadetail/);
  await page.goto("/admin/conciliacion");
  await page.getByRole("button", {name: "Revisar operación"}).click();
  await expect(page.getByRole("dialog")).toContainText("2099-01-15 · 23:30 · hora de Lima · Perú");
  await expect(page.getByRole("dialog")).not.toContainText("Resumen compartido");
  await page.getByRole("dialog").getByRole("button", {name: "Cerrar", exact: true}).click();
  await logout(page);
  await login(page);
  await page.getByRole("button", {name: "Notificaciones", exact: true}).click();
  await expect(page.getByText(/Cita confirmada · 2099-01-15 · 23:30 · hora de Lima/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", {name: "Reprogramar", exact: true}).click();
  await dialog.getByRole("button", {name: "22:00 · hora de Lima", exact: true}).click();
  await dialog.getByRole("button", {name: "Guardar cambios", exact: true}).click();
  await expect(dialog).toHaveCount(0);
  const changed = (await appointment.ref.get()).data();
  expect(changed.startAtIso).toBe("2099-01-16T03:00:00.000Z");
  expect(changed.hora).toBe("22:00"); expect(changed.timeZone).toBe("America/Lima");
  const legacy = (await db.doc("therapist_availability/legacy-madrid").get()).data();
  expect(legacy.startTime).toBe("04:00"); expect(legacy.timezone).toBe("Europe/Madrid");
  expect(legacy.timeZone).toBeUndefined();
  await page.getByRole("button", {name: "Cancelar cita", exact: true}).click();
  await dialog.getByRole("button", {name: "Confirmar cancelación", exact: true}).click();
  await expect(dialog).toHaveCount(0);
  expect((await appointment.ref.get()).data().estado).toBe("cancelada");
  expect((await db.doc(`payment_operations/${appointment.id}`).get()).data().status).toBe("cancelled");
  expect((await db.doc("therapist_availability/legacy-madrid").get()).data().status).toBe("available");
  const summary = (await db.doc("terapias/b-active").get()).data().citas.find(c => c.citaId === appointment.id);
  expect(summary.startAtIso).toBe(changed.startAtIso); expect(summary.estado).toBe("cancelada");
  const events = await db.collection("longitudinal_history").where("sourceId", "==", appointment.id).get();
  expect(events.docs.every(d => d.data().metadata.timeZone === "America/Lima")).toBe(true);
});
for (const [name, now, date, next] of [
  ["month-year boundary: device tomorrow, Lima today", "2099-01-01T02:00:00Z", "2098-12-31", "2099-01-01"],
  ["Lima tomorrow, Honolulu still yesterday", "2099-01-01T06:00:00Z", "2099-01-01", "2099-02-01"],
]) test(name, async ({page}, info) => {
  await page.clock.setFixedTime(new Date(now));
  await seed("future", date, "23:30");
  await seed("next", next, "12:30");
  await seed("past", "2098-12-30", "11:15");
  await seed("ambiguous", "2099-11-01", "01:30", {timeZone: "America/New_York"});
  await login(page);
  await page.getByRole("button", {name: "Agendar", exact: true}).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", {name: "23:30 · hora de Lima", exact: true})).toBeVisible();
  await expect(dialog.getByRole("button", {name: "11:15 · hora de Lima", exact: true})).toHaveCount(0);
  await dialog.getByRole("button", {name: "Próximo mes", exact: true}).click();
  await expect(dialog.getByRole("button", {name: "12:30 · hora de Lima", exact: true})).toBeVisible();
  await expect(dialog.getByRole("button", {name: "23:30 · hora de Lima", exact: true})).toHaveCount(0);
  await dialog.getByRole("button", {name: "Esta semana", exact: true}).click();
  await dialog.getByRole("button", {name: "23:30 · hora de Lima", exact: true}).click();
  await dialog.getByRole("button", {name: "Revisar cotización", exact: true}).click();
  await expect(dialog.getByTestId("booking-quote-schedule")).toContainText(`${date} · 23:30 · hora de Lima`);
  await page.screenshot({path: info.outputPath("calendar-boundary.png"), fullPage: true});
});

test("legacy appointments: UTC, wall-only, DST and unresolved cases remain unchanged on consultation", async ({page}, info) => {
  await page.clock.setFixedTime(new Date("2099-07-14T00:00:00Z"));
  const common = {terapiaId: "b-active", pacienteUid: "patient-b", terapeutaId: "therapist-a",
    estado: "pendiente", modalidad: "Remoto", ubicacion: "Terapia Online"};
  const records = [
    {...common, citaId: "legacy-explicit", fecha: "2099-07-15", hora: "12:00", timeZone: "Europe/Madrid", startAtIso: "2099-07-15T10:00:00Z"},
    {...common, citaId: "legacy-wall", fecha: "2099-07-16", hora: "12:00", timeZone: "Europe/Madrid"},
    {...common, citaId: "legacy-dst", fecha: "2099-11-01", hora: "01:30", timeZone: "America/New_York", startAtIso: "2099-11-01T06:30:00Z"},
    {...common, citaId: "legacy-ambiguous", fecha: "2099-11-01", hora: "01:30", timeZone: "America/New_York"},
    {...common, citaId: "legacy-contradictory", fecha: "2099-07-15", hora: "12:00", timeZone: "Europe/Madrid", startAtIso: "2099-07-15T18:00:00Z"},
  ];
  await db.doc("terapias/b-active").update({citas: records});
  for (const record of records) await db.doc(`citas/${record.citaId}`).set(record);
  await login(page);
  await expect(page.getByRole("region", {name: "Citas pendientes de resolver"})).toBeVisible();
  await expect(page.getByText("Horario por revisar", {exact: true}).first()).toBeVisible();
  await expect(page.getByRole("cell", {name: "05:00", exact: true}).first()).toBeVisible();
  await page.goto("/historial");
  await expect(page.getByRole("cell", {name: "2099-07-16", exact: true})).toBeVisible();
  await expect(page.getByRole("cell", {name: "05:00", exact: true}).first()).toBeVisible();
  await expect(page.getByRole("cell", {name: "01:30", exact: true})).toBeVisible();
  await page.screenshot({path: info.outputPath("legacy-history.png"), fullPage: true});
  await page.goto("/dashboard");
  const next = page.locator(".next-session-card");
  await expect(next).toContainText("05:00");
  await expect(next).toContainText("hora de Lima");
  await expect(next.locator(".session-day")).toHaveText("15");
  expect((await db.doc("terapias/b-active").get()).data().citas).toEqual(records);
  for (const record of records) expect((await db.doc(`citas/${record.citaId}`).get()).data()).toEqual(record);
});
