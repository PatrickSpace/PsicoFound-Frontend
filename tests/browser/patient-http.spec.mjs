import { adminAuth, adminFirestore } from "../helpers/admin-sdk.mjs";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { accounts, password } from "../helpers/followup-fixtures.mjs";
import { httpCall, seedPatient, seedSlots, seedPastAppointment } from "../helpers/patient-http.mjs";
let app, db;
test.beforeEach(async ({ context }) => {
  app = await seedPatient();
  db = adminFirestore.getFirestore(app);
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    // No production services, external links, or AI provider calls.
    if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname.endsWith("/sendProfileChatMessage"))
      return route.abort();
    return route.continue();
  });
});
async function slots() {
  return seedSlots(db);
}
async function modeInPlace(page, mode) {
  await expect.poll(() => page.evaluate(async (value) => {
    const path = "/src/store/appContext.js";
    const { useAppContextStore } = await import(path);
    return useAppContextStore().availableModes.some(item => item.value === value);
  }, mode)).toBe(true);
  await page.evaluate(async (value) => {
    const path = "/src/store/appContext.js";
    const { useAppContextStore } = await import(path);
    useAppContextStore().setActiveMode(value);
  }, mode);
}
async function changeUserInPlace(page, who) {
  await page.evaluate(async ({ email, password }) => {
    const appPath = "/src/plugins/Firebase/firebase.js";
    const sdkPath = "/node_modules/.vite/deps/firebase_auth.js";
    const { auth } = await import(appPath);
    const { signInWithEmailAndPassword } = await import(sdkPath);
    await signInWithEmailAndPassword(auth, email, password);
  }, { email: `${accounts[who].uid}@example.test`, password });
}
for (const status of ["pendiente", "confirmada"]) {
  test(`REV-PAC-03: patient resolves past ${status} and books again`, async ({ page }, info) => {
    await slots();
    await seedPastAppointment(db, status);
    await login(page);
    const pending = page.getByRole("region", { name: "Citas pendientes de resolver" });
    await expect(pending).toBeVisible();
    await expect(page.getByRole("button", { name: "Agendar", exact: true })).toBeDisabled();
    const dialog = page.getByRole("dialog");
    if (status === "confirmada") {
      await pending.getByRole("button", { name: "Reprogramar", exact: true }).click();
      await dialog.getByRole("button", { name: "14:00 · hora de Lima", exact: true }).click();
      await expect(dialog).toContainText("hora de Lima");
      await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(pending).toHaveCount(0);
      expect((await db.doc("therapist_availability/past-slot").get()).data().status).toBe("available");
      expect((await db.doc("therapist_availability/review-fourteen").get()).data().status).toBe("booked");
      expect((await db.doc("payment_operations/past-open").get()).data().status).toBe("pending");
    }
    await page.getByRole("button", { name: "Cancelar cita", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirmar cancelación", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(pending).toHaveCount(0);
    expect((await db.doc("payment_operations/past-open").get()).data().status).toBe("cancelled");
    await page.getByRole("button", { name: "Agendar", exact: true }).click();
    await dialog.getByRole("button", { name: "10:00 · hora de Lima", exact: true }).click();
    await dialog.getByRole("button", { name: "Revisar cotización", exact: true }).click();
    await dialog.getByRole("button", { name: "Confirmar reserva", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Próxima sesión", { exact: true })).toBeVisible();
    const therapy = (await db.doc("terapias/b-active").get()).data();
    expect(therapy.citas.filter(c => c.estado === "pendiente")).toHaveLength(1);
    expect(therapy.citas.find(c => c.citaId === "past-open").estado).toBe("cancelada");
    await shot(page, info, `resolved-past-${status}`);
  });
}
test("REV-PAC-01/05: emotional record persists and professional reads the disclosed note", async ({ page }, info) => {
  await login(page, "/registro-emocional");
  await page.getByRole("button", { name: "Agregar registro" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Profesional A");
  await expect(dialog).toContainText("b-active");
  await expect(dialog).toContainText("serán visibles");
  await choose(page, "Estado principal", "Tranquilo/a");
  await dialog.getByRole("textbox", { name: "Nota compartida con tu profesional" }).fill("Nota compartida persistida");
  await dialog.getByRole("button", { name: "Guardar registro", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Nota compartida persistida", { exact: true })).toBeVisible();
  await page.goto("/configuracion");
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await login(page, "/registro-emocional", "A");
  await modeInPlace(page, "psychologist");
  await expect(page.getByText("Nota compartida persistida", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar registro" })).toHaveCount(0);
  await shot(page, info, "emotion-professional-read");
});
test("REV-PAC-07: same-route mode/user changes reset draft, counters and late active therapy", async ({ page }, info) => {
  // Delay a real result, not a synthetic replacement: release it after switching context.
  await page.route("**/src/services/terapiaService.js*", async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "const therapies = await getTherapiesByPatient(pacienteUid);",
      `const therapies = await getTherapiesByPatient(pacienteUid);
       if (window.__holdEmotionTherapy) {
         window.__holdEmotionTherapy = false;
         await new Promise(resolve => { window.__releaseEmotionTherapy = resolve; });
       }`);
    await route.fulfill({ response, body });
  });
  const base = { mode: "patient", requestId: "browser-emotion", mood: "Tranquilo/a", intensity: 5,
    energy: 5, sleepQuality: 5, tags: [] };
  await httpCall("A", "createEmotionalCheckin", { ...base, terapiaId: "a-personal", note: "Solo proceso personal A" });
  await httpCall("B", "createEmotionalCheckin", { ...base, terapiaId: "b-active", note: "Solo seguimiento B" });
  await login(page, "/registro-emocional", "A");
  await expect(page.getByText("Solo proceso personal A", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agregar registro" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Nota compartida con tu profesional" }).fill("Borrador anterior");
  await modeInPlace(page, "psychologist");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Solo seguimiento B", { exact: true })).toBeVisible();
  await expect(page.getByText("Solo proceso personal A", { exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    window.__holdEmotionTherapy = true;
  });
  await modeInPlace(page, "patient");
  await expect.poll(() => page.evaluate(() => typeof window.__releaseEmotionTherapy)).toBe("function");
  await expect(page.getByText("Solo seguimiento B", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Agregar registro" })).toBeDisabled();
  await modeInPlace(page, "psychologist");
  await expect(page.getByText("Solo seguimiento B", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    window.__releaseEmotionTherapy();
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  await expect(page.getByRole("button", { name: "Agregar registro" })).toHaveCount(0);
  await expect(page.getByText("Solo proceso personal A", { exact: true })).toHaveCount(0);
  await modeInPlace(page, "patient");
  await page.getByRole("button", { name: "Agregar registro" }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "Nota compartida con tu profesional" })).toHaveValue("");
  await page.getByRole("dialog").getByRole("textbox", { name: "Nota compartida con tu profesional" }).fill("Borrador del usuario A");
  // Real Auth change while the Vue route remains mounted (no page navigation).
  await changeUserInPlace(page, "B");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Solo seguimiento B", { exact: true })).toBeVisible();
  await expect(page.getByText("Solo proceso personal A", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Agregar registro" }).click();
  await expect(page.getByRole("dialog")).toContainText("b-active");
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "Nota compartida con tu profesional" })).toHaveValue("");
  await shot(page, info, "emotion-context-reset");
  await page.evaluate(() => {
    window.__holdEmotionTherapy = true;
    window.__releaseEmotionTherapy = null;
  });
  await changeUserInPlace(page, "A");
  await expect.poll(() => page.evaluate(() => typeof window.__releaseEmotionTherapy)).toBe("function");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Solo seguimiento B", { exact: true })).toHaveCount(0);
  await changeUserInPlace(page, "C");
  await expect(page.getByText("Cuando tengas una terapia activa podrás registrar estados emocionales asociados a tu proceso.", { exact: false })).toBeVisible();
  await page.evaluate(async () => {
    window.__releaseEmotionTherapy();
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  await expect(page.getByRole("button", { name: "Agregar registro" })).toBeDisabled();
  await expect(page.getByText("Solo proceso personal A", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/registro-emocional$/);
});
async function login(page, target = "/sesiones", who = "B") {
  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("psicofound-active-mode", "patient"));
  await page.getByRole("textbox", { name:"Correo", exact:true }).fill(`${accounts[who].uid}@example.test`);
  await page.getByRole("textbox", { name:"Contraseña", exact:true }).fill(password);
  await page.getByRole("button", { name:"Iniciar Sesión", exact:true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto(target);
}
async function choose(page, label, option) {
  await page.getByRole("combobox", { name:label, exact:true }).locator("..").click();
  await page.getByRole("option", { name:option, exact:typeof option === "string" }).click();
}
async function shot(page, info, name) {
  await page.screenshot({ path:info.outputPath(name + ".png"), fullPage:true, animations:"disabled" });
}
async function signup(page, email) {
  await page.goto("/registro");
  await expect(page.getByRole("link", {name:"términos de uso", exact:true})).toHaveAttribute("href", "https://example.test/terms");
  await page.getByRole("checkbox", { name:/Acepto/ }).check();
  await page.getByRole("textbox", { name:"Correo", exact:true }).fill(email);
  await page.getByRole("textbox", { name:"Contraseña", exact:true }).fill(password);
  await page.getByRole("button", { name:"Crear cuenta", exact:true }).click();
}
async function oob(email, type) {
  const response = await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-lurems-followup/oobCodes");
  return (await response.json()).oobCodes.filter(c => c.email === email && c.requestType === type).at(-1);
}
async function applyOob(code, endpoint = "update", more = {}) {
  const r = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=synthetic-only`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ oobCode:code, ...more }) });
  expect(r.ok).toBe(true);
}
test("patient: registration, verified email, onboarding and password recovery", async({ page }, info) => {
  const email = `register-${info.project.name}-${Date.now()}@example.test`;
  await signup(page, email);
  await expect(page.getByRole("heading", { name:"Verifica tu correo" })).toBeVisible();
  const user = await adminAuth.getAuth(app).getUserByEmail(email);
  const saved = (await db.doc(`users/${user.uid}`).get()).data();
  expect(saved.legalAcceptance.version).toBe("review-2026-10-06");
  await expect.poll(async() => Boolean(await oob(email, "VERIFY_EMAIL"))).toBe(true);
  await applyOob((await oob(email, "VERIFY_EMAIL")).oobCode);
  await page.getByRole("button", { name:"Ya verifiqué mi correo" }).click();
  await expect(page.getByRole("textbox", { name:"Nombre completo" })).toBeVisible();
  await page.getByRole("textbox", { name:"Nombre completo" }).fill("Paciente registrado en revisión");
  await page.getByRole("textbox", { name:"Fecha de nacimiento" }).fill("2015-04-30");
  await page.getByRole("textbox", { name:"Nombre completo" }).click();
  await expect(page.getByText("Debes tener 18 años o más para continuar.", {exact:true})).toBeVisible();
  await expect(page.getByRole("button", { name:"Continuar", exact:true })).toBeDisabled();
  await page.getByRole("textbox", { name:"Fecha de nacimiento" }).fill("2000-04-30");
  await page.getByRole("button", { name:"Continuar", exact:true }).click();
  await expect(page).toHaveURL(/\/encuesta/);
  expect((await db.doc(`users/${user.uid}`).get()).data().onboardingStatus).toBe("complete");
  await page.goto("/configuracion");
  await page.getByRole("button", { name:"Cerrar sesión", exact:true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("button", { name:"¿Olvidaste tu contraseña?" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name:"Correo" }).fill(email);
  await page.getByRole("button", { name:"Enviar enlace", exact:true }).click();
  await expect.poll(async() => Boolean(await oob(email, "PASSWORD_RESET"))).toBe(true);
  const newPass = "ReviewOnly-2026-New!";
  await applyOob((await oob(email, "PASSWORD_RESET")).oobCode, "resetPassword", { newPassword:newPass });
  await page.goto("/login");
  await page.getByRole("textbox", { name:"Correo", exact:true }).fill(email);
  await page.getByRole("textbox", { name:"Contraseña", exact:true }).fill(newPass);
  await page.getByRole("button", { name:"Iniciar Sesión", exact:true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await shot(page, info, "registration-complete");
});
test("requirement: registration can recover after profile initialization fails", async({ page }, info) => {
  const email = `failed-register-${info.project.name}-${Date.now()}@example.test`;
  await page.route("**/finalizeRegistration", r => r.fulfill({ status:500, contentType:"application/json", body:JSON.stringify({ error:{ status:"INTERNAL", message:"Fallo sintético" } }) }));
  await signup(page, email);
  await expect(page.getByText("Tu cuenta fue creada, pero no pudimos preparar tu perfil.", { exact:false })).toBeVisible();
  const user = await adminAuth.getAuth(app).getUserByEmail(email);
  expect((await db.doc(`users/${user.uid}`).get()).exists).toBe(false);
  await page.unroute("**/finalizeRegistration");
  await page.getByRole("button", { name:"Crear cuenta", exact:true }).click();
  await shot(page, info, "registration-retry");
  await expect(page.getByRole("heading", { name:"Verifica tu correo" })).toBeVisible({ timeout:15000 });
});
test("patient: account editing, own export, deletion request and support response", async({ page }, info) => {
  await login(page, "/configuracion");
  await page.getByRole("button", { name:"Editar perfil de usuario" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name:"Nombre", exact:true }).fill("Paciente B revisión");
  await dialog.getByRole("textbox", { name:"País de residencia" }).fill("España");
  await dialog.getByRole("button", { name:/Guardar/ }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator("main")).toContainText("Paciente B revisión");
  expect((await db.doc("users/patient-b").get()).data().pais).toBe("España");
  expect((await db.doc("users/patient-b").get()).data().zonaHoraria).toBe("Europe/Madrid");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name:"Descargar mis datos" }).click();
  const json = JSON.parse(await readFile(await (await download).path(), "utf8"));
  expect(json.data.user.id).toBe(accounts.B.uid);
  expect(json.data.therapies.every(t => t.pacienteUid === accounts.B.uid)).toBe(true);
  await page.getByRole("button", { name:"Solicitar eliminación", exact:true }).click();
  await dialog.getByRole("textbox", { name:"Confirmación" }).fill("ELIMINAR MI CUENTA");
  await dialog.getByRole("button", { name:"Registrar solicitud" }).click();
  await expect(dialog).toHaveCount(0);
  expect((await db.doc("account_requests/patient-b_deletion").get()).data().status).toBe("pending_policy");
  await page.getByRole("button", { name:"Enviar feedback", exact:true }).click();
  await dialog.getByRole("textbox", { name:"Observación" }).fill("Necesito revisar una cita: prueba sintética");
  await dialog.getByRole("button", { name:"Enviar solicitud" }).click();
  await expect(dialog).toContainText("Necesito revisar una cita");
  const requests = await db.collection("support_requests").where("requesterUid", "==", accounts.B.uid).get();
  expect(requests.size).toBe(1);
  await httpCall("review-admin", "respondSupportRequest", { supportRequestId:requests.docs[0].id, expectedVersion:0, requestId:"browser-response-1", status:"resolved", response:"Respuesta visible para el paciente" });
  await expect(dialog).toContainText("Respuesta visible para el paciente");
  await expect(dialog).toContainText("Resuelta");
  await shot(page, info, "account-and-support");
});
test("patient: book with quote, live confirmation/link, payment, reschedule and cancel", async({ page }, info) => {
  await slots();
  await login(page);
  await page.getByRole("button", { name:"Agendar", exact:true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name:"10:00 · hora de Lima", exact:true }).click();
  await dialog.getByRole("button", { name:"Revisar cotización", exact:true }).click();
  await expect(dialog).toContainText("Cotización para esta reserva");
  await shot(page, info, "booking-quote");
  await dialog.getByRole("button", { name:"Confirmar reserva", exact:true }).click();
  await expect(dialog).toHaveCount(0);
  const current = (await db.collection("citas").where("pacienteUid", "==", accounts.B.uid).where("estado", "==", "pendiente").get()).docs[0];
  expect(current).toBeTruthy();
  const id = current.id;
  expect(current.data().timeZone).toBe("America/Lima");
  await httpCall("A", "changeAppointmentStatus", { mode:"psychologist", appointmentId:id, status:"confirmada", requestId:"review_live_confirm" });
  await httpCall("A", "updateAppointmentDetails", { mode:"psychologist", appointmentId:id, meetingUrl:"https://example.test/synthetic-session", meetingProvider:"google_meet", requestId:"review_live_link" });
  await expect(page.locator("a[href=\"https://example.test/synthetic-session\"]").first()).toBeVisible();
  await page.getByRole("button", { name:"Ya realicé el pago", exact:true }).click();
  await expect(page.getByText("En verificación", { exact:true })).toBeVisible();
  await httpCall("review-admin", "reviewPaymentOperation", { operationId:id, status:"confirmed", providerReference:"LOCAL-SYNTHETIC-REF" });
  await expect(page.getByText("Pago confirmado", { exact:true })).toBeVisible();
  await page.getByRole("button", { name:"Reprogramar", exact:true }).click();
  await dialog.getByRole("button", { name:"14:00 · hora de Lima", exact:true }).click();
  await dialog.getByRole("button", { name:"Guardar cambios", exact:true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await db.doc(`citas/${id}`).get()).data().hora).toBe("14:00");
  expect((await db.doc("therapist_availability/review-ten").get()).data().status).toBe("available");
  await page.getByRole("button", { name:"Cancelar cita", exact:true }).click();
  await dialog.getByRole("button", { name:"Confirmar cancelación", exact:true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await db.doc(`citas/${id}`).get()).data().estado).toBe("cancelada");
  expect((await db.doc("payment_operations/" + id).get()).data().status).toBe("refund_review");
  await expect(page.getByText("Devolución en revisión", { exact:true })).toBeVisible();
  await shot(page, info, "appointment-lifecycle");
});
test("requirement: booking identifies the timezone of the offered slot", async({ page }, info) => {
  await slots();
  const zone = "America/Argentina/Buenos_Aires";
  await db.doc("therapist_availability/review-ten").update({ timeZone: zone });
  await login(page);
  await page.getByRole("button", { name:"Agendar", exact:true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name:"08:00 · hora de Lima", exact:true }).click();
  await dialog.getByRole("button", { name:"Revisar cotización", exact:true }).click();
  await expect(dialog).toContainText("Cotización para esta reserva");
  await expect(dialog.getByTestId("booking-quote-schedule")).toContainText("hora de Lima");
  expect(await dialog.getByTestId("booking-quote-schedule").evaluate(element =>
    element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1
  )).toBe(true);
  await shot(page, info, "timezone-before-confirming");
  await expect(dialog).toContainText("hora de Lima");
});
test("requirement: emotional note sharing is clear before the patient submits it", async({ page }, info) => {
  await login(page, "/registro-emocional");
  await page.getByRole("button", { name:"Agregar registro" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name:"Nota compartida con tu profesional" }).fill("Observación de prueba compartida");
  await shot(page, info, "emotional-note-label");
  await expect(dialog).toContainText(/compartid|podrá leer|psicólogo|profesional/, { timeout:15000 });
});
test("patient: recommendation empty/error/retry states and help remain accessible", async({ page }, info) => {
  await login(page, "/elegirterapeuta");
  await expect(page.getByText("Sin horarios compatibles", { exact:true })).toBeVisible();
  await page.route("**/getRecommendedTherapists", r => r.fulfill({ status:500, contentType:"application/json", body:JSON.stringify({ error:{ status:"INTERNAL", message:"Error sintético de consulta" } }) }));
  await page.getByRole("button", { name:"Aplicar", exact:true }).click();
  await expect(page.getByText("No pudimos cargar las recomendaciones", { exact:true })).toBeVisible();
  await expect(page.getByText("Sin horarios compatibles", { exact:true })).toHaveCount(0);
  await shot(page, info, "recommendations-error-before-retry");
  await page.unroute("**/getRecommendedTherapists");
  await page.getByRole("button", { name:"Reintentar", exact:true }).click();
  await expect(page.getByText("Sin horarios compatibles", { exact:true })).toBeVisible();
  expect((await db.doc("profiles/patient-b").get()).data().motivoConsulta).toBe("Motivo sintético");
  await page.getByText(/Modalidad:.*Flexible/).click();
  await httpCall("B", "updateProfilePreferences", { profile: { modalidad: "presencial" } });
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("Sin coincidencias con estos criterios", { exact: true })).toBeVisible();
  await page.route("**/getRecommendedTherapists", r => r.fulfill({ status:500, contentType:"application/json", body:JSON.stringify({ error:{ status:"INTERNAL", message:"Error sintético" } }) }));
  await page.goto("/elegirterapeuta?crisis=1");
  await expect(page.getByRole("heading", { name:"Estamos contigo en este momento" })).toBeVisible();
  await expect(page.getByRole("link", { name:"Llamar al 113" })).toHaveAttribute("href", "tel:113");
  await shot(page, info, "help-with-recommendation-failure");
});

test("professional rejects a confirmed appointment and patient sees the reason and can choose another time", async ({page}, info) => {
  await slots();
  const quote = await httpCall("B", "getBookingQuote", {therapistId: "therapist-a"});
  const {appointmentId} = await httpCall("B", "reserveAppointment", {mode: "patient",
    terapeutaId: "therapist-a", availabilitySlotId: "review-ten", quoteId: quote.quoteId,
    requestId: "browser-rejection-reserve", shareSurveyHistoryConsent: true});
  await httpCall("A", "changeAppointmentStatus", {mode: "psychologist", appointmentId,
    status: "confirmada", requestId: "browser-rejection-confirm"});
  await login(page, "/configuracion", "A");
  await modeInPlace(page, "psychologist");
  await page.goto("/psicologo/sesiones");
  await expect(page.getByRole("button", {name: "Regresar a pendiente", exact: true})).toHaveCount(0);
  const row = page.getByRole("row").filter({has: page.getByRole("button", {name: "Rechazar cita", exact: true})}).filter({hasText: "confirmada"});
  await row.getByRole("button", {name: "Rechazar cita", exact: true}).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", {name: "Rechazar y avisar"})).toBeDisabled();
  await dialog.getByRole("textbox", {name: "Motivo para el paciente"}).fill("Un percance me impide atenderte en ese horario.");
  await dialog.getByRole("button", {name: "Rechazar y avisar"}).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await db.doc(`citas/${appointmentId}`).get()).data().estado).toBe("cancelada");
  expect((await db.doc("therapist_availability/review-ten").get()).data().status).toBe("closed");
  await changeUserInPlace(page, "B");
  await page.goto("/sesiones");
  await expect(page.getByRole("status").filter({hasText: "Tu profesional solicita un nuevo horario"})).toContainText("Un percance me impide atenderte en ese horario.");
  await expect(page.getByRole("button", {name: "Agendar", exact: true})).toBeEnabled();
  await page.getByRole("button", {name: "Notificaciones", exact: true}).click();
  await expect(page.locator(".v-list-item-subtitle").filter({hasText: "Un percance me impide atenderte en ese horario."})).toBeVisible();
  await page.getByRole("button", {name: "Notificaciones", exact: true}).click();
  await shot(page, info, "professional-rejection-patient-notice");
  await page.getByRole("button", {name: "Agendar", exact: true}).click();
  await expect(page.getByRole("dialog").getByRole("button", {name: "10:00 · hora de Lima", exact: true})).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("button", {name: "14:00 · hora de Lima", exact: true})).toBeVisible();
});

test("requirement: incomplete account resumes registration after login and reload with explicit consent", async({page},info)=>{
  const uid=`recover-${info.project.name}-${Date.now()}`;
  const email=`${uid}@example.test`;
  await adminAuth.getAuth(app).createUser({uid,email,password,emailVerified:true});
  await page.goto('/login');
  await page.getByRole('textbox',{name:'Correo',exact:true}).fill(email);
  await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);
  await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Completa tu registro'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Completar registro',exact:true})).toBeDisabled();
  expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Completa tu registro'})).toBeVisible();
  await page.getByRole('checkbox',{name:'He leído y acepto los términos de uso y la política de privacidad vigentes.'}).check();
  await page.getByRole('button',{name:'Completar registro',exact:true}).click();
  await expect(page).toHaveURL(/\/onboarding\/paciente/);
  const profile=(await db.doc(`users/${uid}`).get()).data();
  expect(profile.legalAcceptance.version).toBe('review-2026-10-06');
  expect((await db.collection(`users/${uid}/consents`).get()).size).toBe(1);
});

test("requirement: incomplete account returns to registration recovery after email verification", async({page},info)=>{
  const uid=`recover-unverified-${info.project.name}-${Date.now()}`;
  const email=`${uid}@example.test`;
  await adminAuth.getAuth(app).createUser({uid,email,password,emailVerified:false});
  await page.goto('/login?redirect=/iniciarencuesta');
  await page.getByRole('textbox',{name:'Correo',exact:true}).fill(email);
  await page.getByRole('textbox',{name:'Contraseña',exact:true}).fill(password);
  await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Verifica tu correo'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Ya verifiqué mi correo'})).not.toHaveClass(/v-btn--loading/);
  await adminAuth.getAuth(app).updateUser(uid,{emailVerified:true});
  await page.getByRole('button',{name:'Ya verifiqué mi correo'}).click();
  await expect(page.getByRole('heading',{name:'Completa tu registro'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Completar registro',exact:true})).toBeDisabled();
  expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
});

test('email verification: Spanish email returns to Lurems, limits resends and detects confirmation on focus',async({page},info)=>{
 await page.clock.install();
 const email=`confirm-${info.project.name}-${Date.now()}@example.test`;
 const requests=[];
 await page.route('**/accounts:sendOobCode**',async route=>{
  const data=route.request().postDataJSON();
  if(data.requestType==='VERIFY_EMAIL')requests.push({data,locale:route.request().headers()['x-firebase-locale']});
  await route.continue();
 });
 await signup(page,email);
 await expect(page.getByRole('heading',{name:'Verifica tu correo'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ya verifiqué mi correo'})).not.toHaveClass(/v-btn--loading/);
 expect(requests.length).toBe(1);expect(requests[0].locale).toBe('es');
 const target=new URL(requests[0].data.continueUrl);expect(target.origin).toBe('http://127.0.0.1:5178');expect(target.pathname).toBe('/verificar-correo');
 expect(target.searchParams.get('redirect')).toBe('/onboarding');
 const resend=page.getByRole('button',{name:'Reenviar enlace',exact:true});await expect(resend).toBeDisabled();
 await page.clock.fastForward(61000);await expect(resend).toBeEnabled();await resend.click();
 await expect(page.getByText('Enviamos un nuevo enlace de verificación.')).toBeVisible();expect(requests.length).toBe(2);await expect(resend).toBeDisabled();
 await expect.poll(async()=>Boolean(await oob(email,'VERIFY_EMAIL'))).toBe(true);
 await applyOob((await oob(email,'VERIFY_EMAIL')).oobCode);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page).toHaveURL(/\/onboarding\/paciente/);
});

test('email verification: failed delivery keeps the account recoverable and does not claim the email was sent',async({page},info)=>{
 const email=`delivery-failed-${info.project.name}-${Date.now()}@example.test`;
 await page.route('**/accounts:sendOobCode**',route=>{
  if(route.request().postDataJSON().requestType==='VERIFY_EMAIL')return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{message:'TOO_MANY_ATTEMPTS_TRY_LATER'}})});
  return route.continue();
 });
 await signup(page,email);
 await expect(page.getByRole('heading',{name:'Verifica tu correo'})).toBeVisible();
 await expect(page.getByText('Tu cuenta está creada, pero no pudimos enviar el enlace.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Reenviar enlace',exact:true})).toBeDisabled();
 const user=await adminAuth.getAuth(app).getUserByEmail(email);expect(user.emailVerified).toBe(false);expect((await db.doc(`users/${user.uid}`).get()).exists).toBe(true);
});

test('email verification: interrupted screen download recovers without repeating registration', async({page},info)=>{
 const email=`chunk-recovery-${info.project.name}-${Date.now()}@example.test`;
 let interrupted=false;
 await page.route('**/src/views/Auth/VerifyEmailView.vue',async route=>{
  if(!interrupted){interrupted=true;return route.abort('failed');}
  return route.continue();
 });
 await signup(page,email);
 await expect(page.getByRole('heading',{name:'Verifica tu correo'})).toBeVisible();
 expect(interrupted).toBe(true);
 await expect(page).toHaveURL(/\/verificar-correo/);
 const user=await adminAuth.getAuth(app).getUserByEmail(email);
 expect((await db.doc(`users/${user.uid}`).get()).exists).toBe(true);
 expect((await db.collection(`users/${user.uid}/consents`).get()).size).toBe(1);
});
