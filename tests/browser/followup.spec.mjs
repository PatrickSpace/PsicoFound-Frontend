import { adminAuth } from "../helpers/admin-sdk.mjs";
import { test, expect } from "@playwright/test";
import { accounts, password, seedFollowup } from "../helpers/followup-fixtures.mjs";

test.beforeEach(async ({ context }) => {
  await seedFollowup();
  // No request from this validation may reach Firebase production or other hosts.
  await context.route("**/*", async (route) => {
    const host = new URL(route.request().url()).hostname;
    if (["127.0.0.1", "localhost"].includes(host)) await route.continue();
    else await route.abort();
  });
});
async function login(page, who, mode, target = "/progreso") {
  await page.goto("/login");
  await page.evaluate((value) => localStorage.setItem("psicofound-active-mode", value), mode);
  await page.getByRole("textbox", { name: "Correo", exact: true }).fill(`${accounts[who].uid}@example.test`);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/configuracion");
  if (who === "A") {
    await page.getByRole("combobox", { name: "Vista activa" }).locator("..").click();
    await page.getByRole("option", { name: mode === "psychologist" ? "Psicólogo" : "Paciente", exact: true }).click();
  }
  await page.goto(target);
}
async function choose(page, label, option) {
  await page.getByRole("combobox", { name: label, exact: true }).locator("..").click();
  await page.getByRole("option", { name: option }).click();
}
async function modeInPlace(page, mode) {
  // Test only: exercise the same store action as Configuración without unmounting
  // the route, so a pending request or open form can be checked directly.
  await page.evaluate(async (value) => {
    const modulePath = "/src/store/appContext.js";
    const { useAppContextStore } = await import(modulePath);
    useAppContextStore().setActiveMode(value);
  }, mode);
}
async function shot(page, testInfo, name, target) {
  const options = { path: testInfo.outputPath(`${name}.png`), animations: "disabled" };
  if (target) await target.screenshot(options);
  else await page.screenshot({ ...options, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test("A-D: patients, two progress entries, exercise completion and consistent earlier history", async ({ page, browser }, testInfo) => {
  await login(page, "A", "psychologist", "/pacientes");
  await expect(page.getByRole("button", { name: "Abrir paciente Paciente B" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Abrir paciente Paciente C" })).toBeEnabled();
  await expect(page.getByText("Resumen no disponible", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Abrir paciente Paciente B" }).click();
  await expect(page.getByText("Motivo compartido de B", { exact: false })).toBeVisible();
  await expect(page.getByText("PRIVADO-NO-COMPARTIR")).toHaveCount(0);
  await choose(page, "Terapia del paciente", /b-old/);
  await expect(page).toHaveURL(/id=b-old/);
  await page.getByRole("button", { name: "Ver resumen", exact: true }).click();
  await expect(page.getByText("Resumen compartido b-old", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("combobox", { name: "Terapia del paciente" }).locator("..").click();
  await expect(page.getByRole("option", { name: /b-other/ })).toHaveCount(0);
  await page.getByRole("option", { name: /b-active/ }).click();
  await page.getByRole("link", { name: "Objetivos de esta terapia" }).click();
  await expect(page).toHaveURL(/therapyId=b-active/);
  await page.getByRole("button", { name: "Crear objetivo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Objetivo", exact: true }).fill("Meta B navegador");
  await dialog.getByRole("textbox", { name: "Descripción", exact: true }).fill("Descripción persistida");
  await dialog.getByRole("button", { name: "Crear objetivo", exact: true }).click();
  const goal = page.getByTestId("goal-card").filter({ hasText: "Meta B navegador" });
  await expect(goal).toBeVisible();
  for (const [progress, note] of [[30, "Primer avance B"], [100, "Segundo avance B"]]) {
    await goal.getByRole("button", { name: "Actualizar avance" }).click();
    await dialog.getByRole("spinbutton", { name: "Avance (%)" }).fill(String(progress));
    await dialog.getByRole("textbox", { name: "Nota de avance" }).fill(note);
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(goal).toContainText(`${progress}%`);
  }
  await page.reload();
  await goal.getByRole("button", { name: "Historial de avances" }).click();
  await expect(goal.getByTestId("goal-progress-entry")).toHaveCount(2);
  await expect(goal).toContainText("Primer avance B");
  await expect(goal).toContainText("Segundo avance B");
  await expect(goal).toContainText("Profesional A");
  await shot(page, testInfo, "objetivos-profesional", goal);
  await page.goto("/herramientas?contextMode=psychologist&patientUid=patient-b&therapyId=b-active");
  await page.getByRole("button", { name: "Asignar ejercicio", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Título del ejercicio" }).fill("Ejercicio B navegador");
  await dialog.getByRole("textbox", { name: "Instrucciones" }).fill("Practicar respiración cinco minutos");
  await dialog.getByRole("textbox", { name: "Frecuencia sugerida" }).fill("Diario");
  await dialog.getByRole("textbox", { name: "Fecha límite" }).fill("2026-11-01");
  await dialog.getByRole("button", { name: "Asignar", exact: true }).click();
  await expect(page.getByTestId("exercise-card")).toContainText("Ejercicio B navegador");
  await expect(page.getByRole("button", { name: "Completar", exact: true })).toHaveCount(0);

  const patientContext = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await patientContext.route("**/*", async (route) => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const patient = await patientContext.newPage();
  await login(patient, "B", "patient", "/progreso");
  const patientGoal = patient.getByTestId("goal-card").filter({ hasText: "Meta B navegador" });
  await patientGoal.getByRole("button", { name: "Historial de avances" }).click();
  await expect(patientGoal.getByTestId("goal-progress-entry")).toHaveCount(2);
  await expect(patientGoal).toContainText("Primer avance B");
  await expect(patient.getByRole("combobox", { name: "Filtrar por paciente" })).toHaveCount(0);
  await patient.goto("/herramientas");
  const exercise = patient.getByTestId("exercise-card").filter({ hasText: "Ejercicio B navegador" });
  await exercise.getByRole("button", { name: "Completar", exact: true }).click();
  await patient.getByRole("textbox", { name: "¿Qué observaste o aprendiste?" }).fill("Me ayudó a respirar con calma");
  await patient.getByRole("dialog").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(exercise).toContainText("Completado");
  await patient.reload();
  await expect(exercise).toContainText("Me ayudó a respirar con calma");
  await shot(patient, testInfo, "ejercicio-paciente", exercise);
  await patientContext.close();
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(page.getByTestId("exercise-card")).toContainText("Me ayudó a respirar con calma");
  await expect(page.getByTestId("exercise-card")).toContainText("Realizado:");
  await choose(page, "Filtrar por paciente", "Paciente C");
  await expect(page.getByTestId("exercise-card")).toContainText("Ejercicio c-old");
  await expect(page.getByTestId("exercise-card")).not.toContainText("Ejercicio B navegador");
  await expect(page.getByRole("button", { name: "Asignar ejercicio", exact: true })).toBeDisabled();
  await page.goto("/historial?contextMode=psychologist&patientUid=patient-b&therapyId=b-active");
  await expect(page.getByTestId("history-event").filter({ hasText: "Meta B navegador" })).toHaveCount(3);
  await expect(page.locator("main")).not.toContainText("a-personal");
  await expect(page.locator("main")).not.toContainText("c-old");
  await page.getByRole("button", { name: "Ver resumen", exact: true }).click();
  await expect(page.getByText("Resumen compartido b-active", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await choose(page, "Filtrar por terapia", /b-old/);
  await expect(page.getByTestId("history-event")).toContainText("Evento b-old");
  await expect(page.getByTestId("history-event")).not.toContainText("b-active");
  await choose(page, "Tipo de evento", "Sesión realizada");
  await expect(page.getByTestId("history-event")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Desde", exact: true }).fill("2026-09-21");
  await expect(page.getByTestId("history-event")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver resumen", exact: true })).toHaveCount(0);
  await expect(page.getByText("No hay eventos registrados para estos filtros.", { exact: false })).toBeVisible();
  await page.getByRole("textbox", { name: "Desde", exact: true }).fill("");
  await expect(page.getByTestId("history-event")).toHaveCount(1);
  await shot(page, testInfo, "historial-anterior");
});

test("E: dual role, empty filters, late requests and stale forms", async ({ page }, testInfo) => {
  await page.route("**/src/composables/useTherapyWorkspace.js*", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "if (gate.isCurrent(ticket)) loading.value = false;",
      "if (gate.isCurrent(ticket)) loading.value = false; window.__finishedFollowupModes?.push(selectedMode);");
    await route.fulfill({ response, body });
  });
  await page.route("**/src/services/followupService.js*", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      'export async function getItemsForTherapies(name, therapies) {',
      'export async function getItemsForTherapies(name, therapies) { if (window.__holdFollowup) { window.__holdFollowup = false; await new Promise(resolve => { window.__releaseFollowup = resolve; }); }');
    await route.fulfill({ response, body });
  });
  await login(page, "A", "psychologist", "/progreso");
  await expect(page.getByTestId("goal-card").filter({ hasText: "Objetivo b-old" })).toBeVisible();
  await expect(page.getByTestId("goal-card").filter({ hasText: "a-personal" })).toHaveCount(0);
  await page.getByRole("button", { name: "Crear objetivo", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Objetivo", exact: true }).fill("BORRADOR-AJENO");
  await modeInPlace(page, "patient");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("goal-card")).toHaveCount(1);
  await expect(page.getByTestId("goal-card")).toContainText("Objetivo a-personal");
  await expect(page.getByRole("heading", { name: "Mis objetivos terapéuticos" })).toBeVisible();
  await expect(page.locator(".progress-stat-card").filter({ hasText: "Registrados" }).locator(".text-h4")).toHaveText("1");
  await expect(page.getByRole("combobox", { name: "Filtrar por paciente" })).toHaveCount(0);
  await page.getByRole("button", { name: "Crear objetivo", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("textbox", { name: "Objetivo", exact: true })).toHaveValue("");
  await page.getByRole("dialog").getByRole("textbox", { name: "Objetivo", exact: true }).fill("Objetivo personal A navegador");
  await page.getByRole("dialog").getByRole("button", { name: "Crear objetivo", exact: true }).click();
  await expect(page.getByTestId("goal-card")).toHaveCount(2);
  await page.evaluate(() => { window.__holdFollowup = true; window.__finishedFollowupModes = []; });
  await modeInPlace(page, "psychologist");
  await page.waitForFunction(() => Boolean(window.__releaseFollowup));
  await modeInPlace(page, "patient");
  await expect(page.getByTestId("goal-card")).toHaveCount(2);
  await page.evaluate(() => { window.__releaseFollowup(); delete window.__releaseFollowup; });
  await page.waitForFunction(() => window.__finishedFollowupModes.includes("psychologist"));
  await expect(page.getByTestId("goal-card")).toHaveCount(2);
  await expect(page.getByTestId("goal-card").filter({ hasText: /Objetivo (b-old|c-old)/ })).toHaveCount(0);
  await expect(page.locator(".progress-stat-card").filter({ hasText: "Registrados" }).locator(".text-h4")).toHaveText("2");
  await page.goto("/herramientas");
  await expect(page.getByTestId("exercise-card")).toHaveCount(1);
  await expect(page.getByTestId("exercise-card")).toContainText("Ejercicio a-personal");
  await expect(page.getByRole("heading", { name: "Mis herramientas terapéuticas" })).toBeVisible();
  await expect(page.locator(".tool-stat-card").filter({ hasText: "Asignados" }).locator(".text-h4")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Asignar ejercicio", exact: true })).toHaveCount(0);
  await modeInPlace(page, "psychologist");
  await expect(page.getByTestId("exercise-card")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Ejercicios asignados a pacientes" })).toBeVisible();
  await expect(page.locator(".tool-stat-card").filter({ hasText: "Asignados" }).locator(".text-h4")).toHaveText("2");
  await page.getByRole("button", { name: "Asignar ejercicio", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Título del ejercicio" }).fill("BORRADOR-AJENO");
  await modeInPlace(page, "patient");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => { window.__holdFollowup = true; window.__finishedFollowupModes = []; });
  await modeInPlace(page, "psychologist");
  await page.waitForFunction(() => Boolean(window.__releaseFollowup));
  await modeInPlace(page, "patient");
  await expect(page.getByTestId("exercise-card")).toHaveCount(1);
  await page.evaluate(() => { window.__releaseFollowup(); delete window.__releaseFollowup; });
  await page.waitForFunction(() => window.__finishedFollowupModes.includes("psychologist"));
  await expect(page.getByTestId("exercise-card")).toHaveCount(1);
  await expect(page.getByTestId("exercise-card")).toContainText("Ejercicio a-personal");
  await shot(page, testInfo, "doble-rol-paciente");
  await modeInPlace(page, "psychologist");
  await choose(page, "Filtrar por terapia", /b-active/);
  await expect(page.getByTestId("exercise-card")).toHaveCount(0);
  await expect(page.getByText("No hay ejercicios asignados en esta selección")).toBeVisible();
  await expect(page.locator(".tool-stat-card").filter({ hasText: "Asignados" }).locator(".text-h4")).toHaveText("0");
});

test("A,F: summary absent/error/restricted and direct unrelated therapy", async ({ page }, testInfo) => {
  await login(page, "A", "psychologist", "/terapiadetail?id=c-old");
  await expect(page.getByText("Resumen no disponible: no hay motivo ni temas registrados.")).toBeVisible();
  await page.route("**/getTherapySharedSummary", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { status: "INTERNAL", message: "Synthetic failure" } }) }));
  await page.goto("/terapiadetail?id=b-active");
  await expect(page.getByText("Error de carga del resumen. Puedes reintentar.")).toBeVisible();
  await page.unroute("**/getTherapySharedSummary");
  await page.route("**/getTherapySharedSummary", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { status: "PERMISSION_DENIED", message: "Synthetic denied" } }) }));
  await page.getByRole("button", { name: "Reintentar resumen" }).click();
  await expect(page.getByText("Acceso restringido al resumen inicial.")).toBeVisible();
  await page.unroute("**/getTherapySharedSummary");
  await page.getByRole("button", { name: "Reintentar resumen" }).click();
  await expect(page.getByText("Motivo compartido de B", { exact: false })).toBeVisible();
  await page.goto("/terapiadetail?id=b-other");
  await expect(page.getByText("Acceso restringido a esta terapia.")).toBeVisible();
  await expect(page.getByText("Resumen compartido b-other")).toHaveCount(0);
  await shot(page, testInfo, "acceso-ajeno-denegado");
});

test("load failures stay distinct from empty goals, exercises and history", async ({ page }) => {
  await page.route("**/src/composables/useTherapyWorkspace.js*", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "const loadedItems = await loadItems",
      'if (window.__failFollowupOnce) { window.__failFollowupOnce = false; throw new Error("Synthetic load failure"); } const loadedItems = await loadItems');
    await route.fulfill({ response, body });
  });
  await login(page, "A", "psychologist", "/progreso");
  for (const [path, testId, empty] of [
    ["/progreso", "goal-card", "Aún no hay objetivos terapéuticos"],
    ["/herramientas", "exercise-card", "No hay ejercicios asignados en esta selección"],
    ["/historial", "history-event", "No hay eventos registrados para estos filtros."],
  ]) {
    await page.goto(path);
    await expect(page.getByTestId(testId).first()).toBeVisible();
    await page.evaluate(() => { window.__failFollowupOnce = true; });
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.getByText("No se pudo cargar el proceso. Actualiza para reintentar.")).toBeVisible();
    await expect(page.getByText(empty, { exact: false })).toHaveCount(0);
    await expect(page.getByTestId(testId)).toHaveCount(0);
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.getByTestId(testId).first()).toBeVisible();
    await expect(page.getByText("No se pudo cargar el proceso. Actualiza para reintentar.")).toHaveCount(0);
  }
});

test("REV-PSI-01: dated therapy choices remain readable and keep context across all followup views", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await seedFollowup({ therapySelectionCases: true });
  await login(page, "A", "psychologist", "/pacientes");
  await page.getByRole("button", { name: "Abrir paciente Paciente B" }).click();
  const choices = [
    ["b-active", "activo", "1/8/2026"],
    ["b-old", "pausa", "1/8/2026"],
    ["b-earlier", "pausa", "11/6/2026"],
    ["b-without-date", "pausa", "Fecha no disponible"],
    ["b-invalid-date", "pausa", "Fecha no disponible"],
  ];
  const label = ([id, state, date]) => `Paciente B · ${id} · ${state} · Creación: ${date}`;
  async function inspectOptions(scope, field, expected) {
    await scope.getByRole("combobox", { name: field, exact: true }).locator("..").click();
    for (const item of expected) {
      const option = page.getByRole("option", { name: label(item), exact: true });
      await option.scrollIntoViewIfNeeded();
      await expect(option).toBeVisible();
      // The actual title must wrap, not just expose hidden text to accessibility.
      const geometry = await option.locator(".v-list-item-title").evaluate((node) => ({
        scroll: node.scrollWidth, width: node.clientWidth,
        scrollHeight: node.scrollHeight, height: node.clientHeight,
        whitespace: getComputedStyle(node.querySelector("span")).whiteSpace,
      }));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
      expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 1);
      expect(geometry.whitespace).toBe("normal");
    }
  }
  async function inspectSelection(scope, field, item) {
    const selection = scope.getByRole("combobox", { name: field, exact: true })
      .locator("..").locator(".v-select__selection");
    await expect(selection).toHaveText(label(item));
    const geometry = await selection.evaluate((node) => ({
      scroll: node.scrollWidth, width: node.clientWidth,
      scrollHeight: node.scrollHeight, height: node.clientHeight,
    }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 1);
  }
  await inspectOptions(page, "Terapia del paciente", choices);
  await page.getByRole("option", { name: label(choices[1]), exact: true }).scrollIntoViewIfNeeded();
  await shot(page, testInfo, "REV-PSI-01-selector-fechas", page.getByRole("listbox"));
  await page.getByRole("option", { name: label(choices[0]), exact: true }).click();
  for (const item of choices) {
    const [id] = item;
    await choose(page, "Terapia del paciente", label(item));
    await expect(page).toHaveURL(new RegExp(`id=${id}(?:&|$)`));
    await inspectSelection(page, "Terapia del paciente", item);
    for (const [link, path, testId, content] of [
      ["Objetivos de esta terapia", "/progreso", "goal-card", `Objetivo ${id}`],
      ["Ejercicios de esta terapia", "/herramientas", "exercise-card", `Ejercicio ${id}`],
      ["Historial terapéutico", "/historial", "history-event", `Evento ${id}`],
    ]) {
      // The history link also exists in the navigation; exercise the contextual action.
      await page.locator("main").getByRole("link", { name: link, exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === path && url.searchParams.get("therapyId") === id);
      const url = new URL(page.url());
      expect(url.pathname).toBe(path);
      expect(url.searchParams.get("patientUid")).toBe(accounts.B.uid);
      expect(url.searchParams.get("therapyId")).toBe(id);
      await expect(page.getByRole("combobox", { name: "Filtrar por paciente" })).toHaveValue("Paciente B");
      await expect(page.getByRole("combobox", { name: "Filtrar por terapia" })).toHaveValue(label(item));
      await inspectSelection(page, "Filtrar por terapia", item);
      if (id === "b-active" && path !== "/historial") {
        await expect(page.getByTestId(testId)).toHaveCount(0);
        const create = path === "/progreso" ? "Crear objetivo" : "Asignar ejercicio";
        await page.getByRole("button", { name: create, exact: true }).click();
        await inspectOptions(page.getByRole("dialog"), "Paciente / terapia", [choices[0]]);
        await page.getByRole("option", { name: label(choices[0]), exact: true }).click();
        await inspectSelection(page.getByRole("dialog"), "Paciente / terapia", choices[0]);
        await shot(page, testInfo, `REV-PSI-01-formulario-${path.slice(1)}`, page.getByRole("dialog"));
        await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
      } else {
        await expect(page.getByTestId(testId)).toHaveCount(1);
        await expect(page.getByTestId(testId)).toContainText(content);
      }
      await inspectOptions(page, "Filtrar por terapia", choices);
      await page.getByRole("option", { name: label(item), exact: true }).click();
      await expect(page.locator("main")).not.toContainText("a-personal");
      await expect(page.locator("main")).not.toContainText("c-old");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.goBack();
      await expect(page.getByRole("combobox", { name: "Terapia del paciente" })).toBeVisible();
    }
  }
});

test("REV-PSI-02: a separate unverified account stays blocked after reseeding", async ({ page }, testInfo) => {
  const app = await seedFollowup();
  const uid = "followup-unverified-control";
  const email = `${uid}@example.test`;
  try { await adminAuth.getAuth(app).createUser({ uid, email, password, emailVerified: false }); }
  catch (error) {
    if (error.code !== "auth/uid-already-exists") throw error;
    await adminAuth.getAuth(app).updateUser(uid, { emailVerified: false });
  }
  await seedFollowup();
  expect((await adminAuth.getAuth(app).getUser(uid)).emailVerified).toBe(false);
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Correo", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/verificar-correo/);
  for (const path of ["/configuracion", "/progreso", "/herramientas", "/historial", "/terapiadetail?id=b-active"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/verificar-correo/);
    await expect(page.getByRole("heading", { name: "Verifica tu correo" })).toBeVisible();
    await expect(page.getByTestId("goal-card")).toHaveCount(0);
    await expect(page.getByTestId("exercise-card")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Ya verifiqué mi correo" }).click();
  await expect(page.getByText("El correo aún no figura como verificado.")).toBeVisible();
  await shot(page, testInfo, "REV-PSI-02-correo-no-verificado");
});
