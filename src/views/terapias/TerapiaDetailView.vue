<template>
  <LayoutDefault layout>
    <v-container class="therapy-detail-view">
      <div class="mb-6">
        <p class="text-overline text-secondary mb-1">Proceso terapéutico</p>
        <h1 class="text-h4 font-weight-bold">Detalle de terapia</h1>
        <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
          Revisa el estado del proceso, agenda nuevas citas y consulta sesiones asociadas.
        </p>
      </div>

      <v-row v-if="therapy" align="stretch">
        <v-col cols="12" md="8" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-account-heart-outline</v-icon>
              {{ therapy.terapeutaNombre || "Terapia activa" }}
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <div class="d-flex flex-wrap align-center ga-3 mb-4">
                <v-chip size="small" variant="tonal" :color="statusColor(therapy.estado)">
                  {{ therapy.estado || "activo" }}
                </v-chip>
                <span class="text-body-2 text-medium-emphasis">
                  Creada el {{ formattedCreationDate }}
                </span>
              </div>
              <v-list density="compact" class="bg-transparent pa-0">
                <v-list-item
                  prepend-icon="mdi-account-outline"
                  title="Paciente"
                  :subtitle="therapy.pacienteNombre || 'Usuario demo'"
                />
                <v-list-item
                  prepend-icon="mdi-calendar-month-outline"
                  title="Citas registradas"
                  :subtitle="`${appointmentItems.length} sesiones asociadas`"
                />
                <v-list-item
                  prepend-icon="mdi-heart-pulse"
                  title="Estado del proceso"
                  :subtitle="therapy.estado || 'activo'"
                />
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-lightning-bolt-outline</v-icon>
              Acciones
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <v-btn
                v-if="canCreateAppointment"
                block
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-calendar-plus"
                :disabled="normalizedTherapyStatus !== 'activo'"
                @click="dialog = true"

        class="pf-btn-secondary">
                Agendar cita
              </v-btn>
              <div class="text-caption text-medium-emphasis mt-3">
                {{ appointmentActionHint }}
              </div>
              <v-btn
                v-if="canChangeTherapyStatus"
                block
                class="mt-4 pf-btn-hope"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-pause-circle"
                :loading="changingStatus === 'pausa'"
                :disabled="normalizedTherapyStatus !== 'activo' || Boolean(changingStatus)"
                @click="changeTherapyStatus('pausa')"
              >
                Poner en pausa
              </v-btn>
              <v-btn
                v-if="canChangeTherapyStatus"
                block
                class="mt-3 pf-btn-patient"
                color="success"
                variant="tonal"
                prepend-icon="mdi-play-circle"
                :loading="changingStatus === 'activo'"
                :disabled="!['pausa', 'cancelada'].includes(normalizedTherapyStatus) || Boolean(changingStatus)"
                @click="changeTherapyStatus('activo')"
              >
                Reactivar terapia
              </v-btn>
              <v-btn
                v-if="canChangeTherapyStatus"
                block
                class="mt-3 pf-btn-destructive"
                color="error"
                variant="tonal"
                prepend-icon="mdi-cancel"
                :loading="changingStatus === 'cancelada'"
                :disabled="normalizedTherapyStatus === 'cancelada' || Boolean(changingStatus)"
                @click="changeTherapyStatus('cancelada')"
              >
                Cancelar terapia
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card v-else class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-text>
          No se encontró la terapia seleccionada.
        </v-card-text>
      </v-card>

      <v-card
        v-if="therapy"
        class="pa-4 mt-6 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-calendar-check-outline</v-icon>
          Citas asociadas
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>
          <v-data-table
            :headers="appointmentHeaders"
            :items="appointmentItems"
            class="card-backgoundcustom therapy-appointments-table"
            :items-per-page="10"
          >
            <template #no-data>
              <v-empty-state
                headline="Aún no hay citas asociadas"
                text="Agenda la primera sesión para iniciar el seguimiento del proceso."
                icon="mdi-calendar-search"
              ></v-empty-state>
            </template>
            <template #item.estado="{ value }">
              <v-chip size="small" variant="tonal" :color="statusColor(value)">
                {{ value || "pendiente" }}
              </v-chip>
            </template>
            <template #item.meetingUrl="{ item }">
              <v-btn
                v-if="item.meetingUrl"
                :href="item.meetingUrl"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-video-outline"

        class="pf-btn-secondary">
                Abrir
              </v-btn>
              <v-chip v-else size="small" variant="tonal" color="secondary">
                Pendiente
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <CitaDialog
        v-model="dialog"
        :terapia-id="therapy?.id || ''"
        :terapeuta-id="therapy?.terapeutaId || ''"
        :terapeuta-nombre="therapy?.terapeutaNombre || ''"
        :paciente-uid="therapy?.pacienteUid || ''"
        :paciente-nombre="therapy?.pacienteNombre || ''"
        :paciente-email="therapy?.pacienteEmail || ''"
        @saved="loadTherapy"
      />
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import {
  getActiveTherapyByPatient,
  getTherapyById,
  getTherapyByIdForPatient,
  updateTherapyStatus,
} from "@/services/terapiaService";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);
const therapy = ref(null);
const dialog = ref(false);
const changingStatus = ref("");
const appointmentHeaders = [
  { title: "Fecha", value: "fecha" },
  { title: "Hora", value: "hora" },
  { title: "Estado", value: "estado" },
  { title: "Sesión online", value: "meetingUrl", sortable: false },
  { title: "Notas", value: "notas" },
];

const formattedCreationDate = computed(() => {
  if (!therapy.value?.fechaCreacion) return "No definida";
  const parsed = new Date(therapy.value.fechaCreacion);
  if (Number.isNaN(parsed.getTime())) return "No definida";
  return parsed.toLocaleDateString("es-PE");
});

const normalizedTherapyStatus = computed(() =>
  (therapy.value?.estado || "").toString().trim().toLowerCase()
);

const isPatientMode = computed(() => appContext.activeMode === "patient");
const isPsychologistMode = computed(() => appContext.activeMode === "psychologist");
const isAdminMode = computed(() => appContext.activeMode === "admin");
const canCreateAppointment = computed(
  () => isPatientMode.value && normalizedTherapyStatus.value === "activo"
);
const canChangeTherapyStatus = computed(
  () => isPatientMode.value && Boolean(therapy.value?.id)
);
const appointmentActionHint = computed(() =>
  canCreateAppointment.value
    ? "Solo puedes agendar nuevas citas cuando la terapia está en estado activo."
    : "La agenda de nuevas citas está disponible desde la vista del paciente."
);

const appointmentItems = computed(() =>
  (Array.isArray(therapy.value?.citas) ? therapy.value.citas : []).map((appointment) => ({
    citaId: appointment.citaId || `${appointment.fecha}-${appointment.hora}`,
    fecha: appointment.fecha || "Sin fecha",
    hora: appointment.hora || "Sin hora",
    estado: appointment.estado || "pendiente",
    meetingUrl: appointment.meetingUrl || "",
    notas: appointment.notas || "Sin notas",
  }))
);

function statusColor(status) {
  const normalized = (status || "").toString().trim().toLowerCase();
  if (normalized === "realizada" || normalized === "completada") return "primary";
  if (normalized === "activo") return "success";
  if (normalized === "pausa") return "warning";
  if (normalized === "cancelada") return "error";
  if (normalized === "finalizado") return "error";
  return "secondary";
}

async function loadTherapy() {
  const uid = currentUser.value?.uid;
  let therapyId = route.query.id?.toString() || "";

  if (!uid) {
    therapy.value = null;
    return;
  }

  try {
    if (!therapyId) {
      if (!isPatientMode.value) {
        router.replace("/pacientes");
        return;
      }

      const activeTherapy = await getActiveTherapyByPatient(uid);

      if (!activeTherapy?.id) {
        router.replace("/sesiones");
        return;
      }

      therapyId = activeTherapy.id;
      await router.replace({ path: "/terapiadetail", query: { id: therapyId } });
    }

    therapy.value = await loadTherapyForActiveMode(therapyId, uid);

    if (!therapy.value) {
      router.replace(defaultRouteForMode(appContext.activeMode));
    }
  } catch (error) {
    console.error("Error loading therapy detail:", error);
    therapy.value = null;
  }
}

async function loadTherapyForActiveMode(therapyId, uid) {
  if (isPatientMode.value) {
    return getTherapyByIdForPatient(therapyId, uid);
  }

  const selectedTherapy = await getTherapyById(therapyId);

  if (!selectedTherapy) {
    return null;
  }

  if (isAdminMode.value) {
    return selectedTherapy;
  }

  if (isPsychologistMode.value) {
    const therapist = await getTherapistByUserUid(uid);
    return therapist?.id && selectedTherapy.terapeutaId === therapist.id
      ? selectedTherapy
      : null;
  }

  return null;
}

function defaultRouteForMode(mode) {
  if (mode === "psychologist" || mode === "admin") {
    return "/pacientes";
  }

  return "/dashboard";
}

async function changeTherapyStatus(estado) {
  if (!therapy.value?.id || changingStatus.value) {
    return;
  }

  changingStatus.value = estado;

  try {
    await updateTherapyStatus(therapy.value.id, estado);
    await loadTherapy();

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Terapia actualizada",
          message: `La terapia fue marcada como ${estado}.`,
        },
      })
    );
  } catch (error) {
    console.error("Error updating therapy status:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message:
            error?.message || "No se pudo actualizar el estado de la terapia.",
        },
      })
    );
  } finally {
    changingStatus.value = "";
  }
}

watch(
  [() => route.query.id, () => currentUser.value?.uid, () => appContext.activeMode],
  () => {
    loadTherapy();
  },
  { immediate: true }
);
</script>

<style scoped>
.therapy-detail-view {
  max-width: 1180px;
}

.therapy-appointments-table {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .therapy-detail-view {
    padding-inline: 16px;
  }

  .therapy-detail-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>
