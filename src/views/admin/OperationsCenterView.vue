<template>
  <LayoutDefault layout>
    <v-container v-if="workspace.active.value" class="pa-0 operations-center">
      <div class="page-header">
        <h1 class="text-h4 font-weight-bold">Centro de operaciones</h1>
        <p>Atiende devoluciones, saldos, soporte e incidencias. Cada caso conserva su responsable y sus decisiones.</p>
      </div>
      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
      <v-card class="pa-4 mb-5" variant="tonal">
        <h2 class="text-h6">Pagos y reservas</h2>
        <v-progress-linear v-if="overviewLoading" indeterminate aria-label="Consultando operación de pagos" />
        <template v-if="overview">
        <p>{{ overview.automationEnabled ? `Confirmación automática configurada · ${overview.mode === 'production' ? 'Producción' : 'Pruebas'}` : 'Cobros mediante enlaces de Mercado Pago y confirmación administrativa.' }}</p>
        <p v-if="overview.configurationError" role="alert">La configuración del proveedor requiere corrección.</p>
        <p>Última ejecución de vencimientos: {{ overview.lastRun ? adminDate(overview.lastRun) : 'Sin ejecución registrada' }}.</p>
        <p v-if="overview.automationEnabled">Última comunicación correcta con el proveedor: {{ overview.lastProviderSuccess ? adminDate(overview.lastProviderSuccess) : 'Aún sin verificación registrada' }}.</p>
        <v-alert v-if="schedulerStale" type="warning" variant="tonal" class="my-3">El vencimiento automático no registra actividad reciente. Revisa el servicio y las reservas vencidas.</v-alert>
        <p v-if="!overview.backfillComplete" class="mt-2">Se están incorporando los casos anteriores a esta bandeja. La sincronización continúa por lotes.</p>
        </template>
        <p v-else-if="!overviewLoading">No pudimos consultar el estado de pagos. Actualiza para volver a comprobarlo.</p>
        <v-btn class="mt-3" :loading="loading || overviewLoading" @click="refresh">Actualizar estado</v-btn>
        <v-btn class="mt-3 ml-2" to="/admin/conciliacion" variant="text">Abrir pagos y transferencias</v-btn>
      </v-card>
      <div class="d-flex flex-wrap ga-3 mb-3">
        <v-select v-model="statusFilter" label="Estado" :items="statusOptions" class="filter" />
        <v-select v-model="kindFilter" label="Tipo de tarea" :items="kindOptions" class="filter" />
        <v-select v-model="priorityFilter" label="Prioridad" :items="priorityOptions" class="filter" />
      </div>
      <p class="text-caption mb-3">Los filtros de estado, tipo y prioridad consultan toda la bandeja. Cada página carga hasta 50 tareas.</p>
      <v-data-table class="desktop-tasks" :headers="headers" :items="tasks" :loading="loading" :items-per-page="10" no-data-text="No hay tareas para estos filtros.">
        <template #item.title="{ item }"><strong>{{ item.title }}</strong><p class="text-caption">{{ item.description }}</p></template>
        <template #item.priority="{ value }"><v-chip :color="value === 'critical' ? 'error' : value === 'high' ? 'warning' : 'info'" size="small">{{ priorities[value] || value }}</v-chip></template>
        <template #item.status="{ value }">{{ statuses[value] || value }}</template>
        <template #item.assignedTo="{ value }">{{ value || 'Sin asignar' }}</template>
        <template #item.updatedAt="{ value }">{{ adminDate(value) }}</template>
        <template #item.actions="{ item }"><v-btn size="small" @click="openTask(item)">Atender</v-btn></template>
      </v-data-table>
      <section class="mobile-tasks" aria-label="Tareas de operación en móvil">
        <v-progress-linear v-if="loading" indeterminate aria-label="Cargando tareas" />
        <p v-if="!loading && !tasks.length">No hay tareas para estos filtros.</p>
        <v-card v-for="task in tasks" :key="task.id" variant="outlined" class="pa-4 mb-3">
          <div class="d-flex flex-wrap ga-2 mb-3"><v-chip size="small" :color="task.priority === 'critical' ? 'error' : task.priority === 'high' ? 'warning' : 'info'">{{ priorities[task.priority] }}</v-chip><v-chip size="small" variant="tonal">{{ statuses[task.status] }}</v-chip></div>
          <h2 class="text-subtitle-1 font-weight-bold mb-2">{{ task.title }}</h2>
          <p>{{ task.description }}</p>
          <p class="text-caption my-3">Responsable: {{ task.assignedTo || 'Sin asignar' }}<br>Actualizada: {{ adminDate(task.updatedAt) }}</p>
          <v-btn block color="secondary" variant="tonal" @click="openTask(task)">Atender tarea</v-btn>
        </v-card>
      </section>
      <CollectionPager :names="['admin_tasks']" :local-filters="false" />
      <v-dialog v-model="dialog" max-width="900" scrollable :persistent="saving">
        <v-card v-if="selected" :title="selected.title">
          <v-card-text>
            <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
            <p>{{ selected.description }}</p>
            <p class="my-2">Estado: {{ statuses[selected.status] }} · Responsable: {{ selected.assignedTo || 'Sin asignar' }}</p>
            <p v-if="selected.reviewAt">Próxima revisión: {{ adminDate(selected.reviewAt) }}</p>
            <v-btn v-if="selected.sourceRoute !== '/admin/operaciones'" class="my-3" :to="selected.sourceRoute" @click="dialog = false">Abrir caso y resolver</v-btn>
            <p v-if="sourceControlled" class="text-body-2 mb-4">La tarea permanecerá pendiente hasta resolver el caso de origen. Puedes asignártela, documentar avances o indicar un bloqueo.</p>
            <template v-if="selected.kind === 'professional'">
              <h2 class="text-h6 mt-4">Reservas futuras afectadas</h2>
              <p>Coordina con cada paciente antes de cancelar. Un pago confirmado pasará a revisión de devolución.</p>
              <v-textarea v-model="cancellationReason" label="Motivo y coordinación realizada" maxlength="500" />
              <v-table><thead><tr><th>Cita · Perú</th><th>Paciente</th><th>Pago</th><th>Acción</th></tr></thead><tbody>
                <tr v-for="appointment in affected" :key="appointment.id"><td>{{ adminDate(appointment.startAtIso) }}</td><td>{{ appointment.patientUid }}</td><td>{{ appointment.paymentStatus }}</td><td><v-btn size="small" :loading="saving" :disabled="!cancellationReason.trim()" @click="cancelAppointment(appointment)">Cancelar reserva</v-btn></td></tr>
              </tbody></v-table>
              <v-btn class="my-3" :loading="affectedLoading" @click="loadAffected(false)">Actualizar reservas</v-btn>
              <v-btn v-if="affectedPage.hasMore" class="my-3" :loading="affectedLoading" @click="loadAffected(true)">Ver más reservas</v-btn>
              <p v-if="!affectedLoading && !affected.length">No hay reservas futuras pendientes en este profesional.</p>
            </template>
            <template v-if="!sourceControlled || selected.status !== 'resolved'">
            <h2 class="text-h6 mt-5">Registrar gestión</h2>
            <v-select v-model="nextStatus" label="Estado de la gestión" :items="editableStatuses" />
            <v-checkbox v-model="assignToMe" label="Asignarme esta tarea" />
            <v-textarea v-model="note" label="Decisión, evidencia o motivo del bloqueo" maxlength="1200" counter />
            <p v-if="selected.kind === 'checklist'" class="mb-3">Al completar esta revisión, se programará otra dentro de {{ selected.reviewDays }} días. Registra la evidencia y los pendientes detectados.</p>
            <v-btn :loading="saving" :disabled="!note.trim() || !nextStatus" @click="saveTask">Guardar gestión</v-btn>
            </template>
            <h2 class="text-h6 mt-6">Historial</h2>
            <p v-for="entry in history" :key="entry.id" class="my-3">{{ adminDate(entry.createdAt) }} · {{ entry.actorUid }} · {{ statuses[entry.action] || entry.action }}<br>{{ entry.note }}</p>
            <v-btn v-if="historyPage.hasMore" :loading="historyLoading" @click="loadHistory(true)">Ver historial anterior</v-btn>
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn :disabled="saving" @click="dialog = false">Cerrar</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { where } from "firebase/firestore";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CollectionPager from "@/components/admin/CollectionPager.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, adminRequestId, watchAdminCollection } from "@/services/adminService";

const statuses = {open: "Pendiente", in_progress: "En gestión", blocked: "Bloqueada", resolved: "Resuelta"};
const priorities = {critical: "Crítica", high: "Alta", normal: "Normal"};
const priorityOptions = [{title: "Todas", value: "all"}, ...Object.entries(priorities).map(([value, title]) => ({title, value}))];
const statusOptions = [{title: "Pendientes y en gestión", value: "active"}, ...Object.entries(statuses).map(([value, title]) => ({title, value}))];
const kindOptions = [{title: "Todas", value: "all"}, ...Object.entries({payment: "Devoluciones y pagos", transfer: "Saldos profesionales", exception: "Incidencias de pago", professional: "Agenda afectada", support: "Soporte", alert: "Alertas", privacy: "Privacidad", application: "Solicitudes profesionales", checklist: "Revisiones periódicas"}).map(([value, title]) => ({title, value}))];
const headers = [{title: "Tarea", key: "title"}, {title: "Prioridad", key: "priority"}, {title: "Estado", key: "status"}, {title: "Responsable", key: "assignedTo"}, {title: "Actualizada", key: "updatedAt"}, {title: "Acciones", key: "actions", sortable: false}];
const tasks = ref([]), overview = ref(null), overviewLoading = ref(true), loading = ref(false), error = ref("");
const statusFilter = ref("active"), kindFilter = ref("all"), priorityFilter = ref("all"), dialog = ref(false), selectedId = ref(""), saving = ref(false), formError = ref("");
const note = ref(""), nextStatus = ref("in_progress"), assignToMe = ref(true), history = ref([]), historyPage = ref({}), historyLoading = ref(false);
const affected = ref([]), affectedPage = ref({}), affectedLoading = ref(false), cancellationReason = ref("");
let detailVersion = 0;
const clock = ref(Date.now());
const healthTimer = setInterval(() => {clock.value = Date.now();}, 30000);
onBeforeUnmount(() => clearInterval(healthTimer));
const selected = computed(() => tasks.value.find(task => task.id === selectedId.value));
const sourceControlled = computed(() => !["checklist", "exception"].includes(selected.value?.kind));
const editableStatuses = computed(() => Object.entries(statuses).filter(([value]) => value !== "resolved" || !sourceControlled.value).map(([value, title]) => ({title, value})));
const schedulerStale = computed(() => !overview.value?.lastRun || clock.value - Date.parse(overview.value.lastRun) > 5 * 60000);
const workspace = useAdminWorkspace(() => {
  detailVersion++; tasks.value = []; overview.value = null; overviewLoading.value = true; error.value = ""; formError.value = ""; dialog.value = false; selectedId.value = ""; history.value = []; affected.value = []; saving.value = false;
}, current => {
  loading.value = true;
  const constraints = [statusFilter.value === "active" ? where("status", "in", ["open", "in_progress", "blocked"]) : where("status", "==", statusFilter.value)];
  if (kindFilter.value !== "all") constraints.push(where("kind", "==", kindFilter.value));
  if (priorityFilter.value !== "all") constraints.push(where("priority", "==", priorityFilter.value));
  const stop = watchAdminCollection("admin_tasks", data => {if (current()) {tasks.value = data; loading.value = false;}}, e => {if (current()) {error.value = e.message; loading.value = false;}}, {constraints});
  loadOverview(current);
  return stop;
});
watch([statusFilter, kindFilter, priorityFilter], () => workspace.reload());
watch(selected, value => { if (!value) dialog.value = false; });
async function loadOverview(current = workspace.capture()) {
  try {const data = await adminCall("getAdminOperationsOverview"); if (current()) overview.value = data;}
  catch (e) {if (current()) error.value = e.message;}
  finally {if (current()) overviewLoading.value = false;}
}
function refresh() { workspace.reload(); }
async function openTask(task) {
  selectedId.value = task.id; dialog.value = true; nextStatus.value = task.status === "resolved" ? "resolved" : "in_progress";
  formError.value = ""; note.value = ""; assignToMe.value = true; cancellationReason.value = ""; history.value = []; affected.value = []; detailVersion++;
  await loadHistory(false);
  if (selected.value?.kind === "professional") await loadAffected(false);
}
async function loadHistory(more) {
  const current = workspace.capture(), version = detailVersion, id = selectedId.value;
  historyLoading.value = true;
  try {const page = await adminCall("getAdminTaskHistory", {taskId: id, ...(more ? {cursor: historyPage.value.cursor} : {})});
    if (current() && version === detailVersion) {history.value = more ? [...history.value, ...page.items] : page.items; historyPage.value = page;}}
  catch (e) {if (current() && version === detailVersion) formError.value = e.message;}
  finally {if (current() && version === detailVersion) historyLoading.value = false;}
}
async function loadAffected(more) {
  if (!selected.value?.therapistId) return;
  const current = workspace.capture(), version = detailVersion; affectedLoading.value = true;
  try {const page = await adminCall("getAdminAffectedAppointments", {therapistId: selected.value.therapistId, ...(more ? {cursor: affectedPage.value.cursor} : {})});
    if (current() && version === detailVersion) {affected.value = more ? [...affected.value, ...page.items] : page.items; affectedPage.value = page;}}
  catch (e) {if (current() && version === detailVersion) formError.value = e.message;}
  finally {if (current() && version === detailVersion) affectedLoading.value = false;}
}
async function saveTask() {
  if (saving.value || !selected.value) return;
  const current = workspace.capture(), version = detailVersion; saving.value = true; formError.value = "";
  try {await adminCall("updateAdminTask", {taskId: selected.value.id, expectedVersion: selected.value.version, status: nextStatus.value, note: note.value, assignToMe: assignToMe.value});
    if (current() && version === detailVersion) {note.value = ""; await loadHistory(false);}}
  catch (e) {if (current() && version === detailVersion) formError.value = e.message;}
  finally {if (current()) saving.value = false;}
}
async function cancelAppointment(appointment) {
  if (saving.value || !cancellationReason.value.trim()) return;
  const current = workspace.capture(), version = detailVersion; saving.value = true; formError.value = "";
  try {await adminCall("cancelAdminReservation", {appointmentId: appointment.id, mode: "admin", status: "cancelada", expectedVersion: appointment.version, reason: cancellationReason.value, requestId: adminRequestId()});
    if (current() && version === detailVersion) await loadAffected(false);}
  catch (e) {if (current() && version === detailVersion) formError.value = e.message;}
  finally {if (current()) saving.value = false;}
}
</script>
<style scoped>
.mobile-tasks { display: none; }
@media (max-width: 760px) {
  .desktop-tasks { display: none; }
  .mobile-tasks { display: block; }
}
.filter { flex: 1 1 240px; }
p { overflow-wrap: anywhere; }
:deep(.v-card-title) { white-space: normal; }
:deep(.v-btn) { max-width: 100%; height: auto; min-height: 36px; padding-block: 8px; }
:deep(.v-btn__content) { white-space: normal; }
</style>
