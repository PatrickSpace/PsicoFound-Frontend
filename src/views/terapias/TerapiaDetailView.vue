<template>
  <LayoutDefault layout>
    <v-container>
      <h1 class="text-h4">Detalle de terapia</h1>
      <v-divider class="my-5 mx-auto"></v-divider>

      <v-row v-if="therapy" align="stretch">
        <v-col cols="12" md="8" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h5">
              {{ therapy.terapeutaNombre || "Terapia activa" }}
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <div class="text-body-1 mb-3">
                Estado actual:
                <v-chip size="small" variant="tonal" :color="statusColor(therapy.estado)">
                  {{ therapy.estado || "activo" }}
                </v-chip>
              </div>
              <div class="text-body-2 text-medium-emphasis mb-2">
                Usuario: {{ therapy.pacienteNombre || "Usuario demo" }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-2">
                Terapeuta ID: {{ therapy.terapeutaId || "No definido" }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Fecha de creación: {{ formattedCreationDate }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h5">Acciones</v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <v-btn
                block
                color="secondary"
                prepend-icon="mdi-calendar-plus"
                :disabled="normalizedTherapyStatus !== 'activo'"
                @click="dialog = true"
              >
                Agendar cita
              </v-btn>
              <div class="text-caption text-medium-emphasis mt-3">
                Solo puedes agendar nuevas citas cuando la terapia está en estado activo.
              </div>
              <v-btn
                block
                class="mt-4"
                color="warning"
                prepend-icon="mdi-pause-circle"
                :disabled="normalizedTherapyStatus !== 'activo' || changingStatus"
                @click="changeTherapyStatus('pausa')"
              >
                Poner en pausa
              </v-btn>
              <v-btn
                block
                class="mt-3"
                color="success"
                prepend-icon="mdi-play-circle"
                :disabled="!['pausa', 'cancelada'].includes(normalizedTherapyStatus) || changingStatus"
                @click="changeTherapyStatus('activo')"
              >
                Reactivar terapia
              </v-btn>
              <v-btn
                block
                class="mt-3"
                color="error"
                prepend-icon="mdi-cancel"
                :disabled="normalizedTherapyStatus === 'cancelada' || changingStatus"
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
        <v-card-title class="text-h5">Citas asociadas</v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>
          <v-data-table
            :headers="appointmentHeaders"
            :items="appointmentItems"
            class="card-backgoundcustom"
            :items-per-page="10"
          >
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
              >
                Abrir
              </v-btn>
              <v-chip v-else size="small" variant="tonal" color="grey">
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
import {
  getActiveTherapyByPatient,
  getTherapyByIdForPatient,
  updateTherapyStatus,
} from "@/services/terapiaService";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapy = ref(null);
const dialog = ref(false);
const changingStatus = ref(false);
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
  if (normalized === "activo") return "green";
  if (normalized === "pausa") return "orange";
  if (normalized === "cancelada") return "red";
  if (normalized === "finalizado") return "red";
  return "blue";
}

async function loadTherapy() {
  const pacienteUid = currentUser.value?.uid;
  let therapyId = route.query.id?.toString() || "";

  if (!pacienteUid) {
    therapy.value = null;
    return;
  }

  try {
    if (!therapyId) {
      const activeTherapy = await getActiveTherapyByPatient(pacienteUid);

      if (!activeTherapy?.id) {
        router.replace("/sesiones");
        return;
      }

      therapyId = activeTherapy.id;
      await router.replace({ path: "/terapiadetail", query: { id: therapyId } });
    }

    therapy.value = await getTherapyByIdForPatient(therapyId, pacienteUid);

    if (!therapy.value) {
      router.replace("/dashboard");
    }
  } catch (error) {
    console.error("Error loading therapy detail:", error);
    therapy.value = null;
  }
}

async function changeTherapyStatus(estado) {
  if (!therapy.value?.id) {
    return;
  }

  changingStatus.value = true;

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
    changingStatus.value = false;
  }
}

watch(
  [() => route.query.id, () => currentUser.value?.uid],
  () => {
    loadTherapy();
  },
  { immediate: true }
);
</script>
