<template>
  <v-row class="appointments-toolbar mb-2" align="center">
    <v-col cols="12" md="6">
      <v-btn
        color="secondary"
        prepend-icon="mdi-plus"
        variant="tonal"
        class="appointments-action"
        :disabled="!activeTherapy"
        @click="openAppointmentDialog"
      >
        Agregar cita
      </v-btn>
    </v-col>

    <v-col cols="12" md="6">
      <v-text-field
        v-model="search"
        clearable
        prepend-inner-icon="mdi-magnify"
        label="Buscar citas"
        class="w-100"
        variant="outlined"
        density="comfortable"
      />
    </v-col>
  </v-row>

  <v-data-table
    :headers="headers"
    :items="filteredItems"
    class="card-backgoundcustom appointments-table"
    :items-per-page="10"
    :loading="loading"
    :sort-by="[{ key: 'fechaOrden', order: 'desc' }]"
  >
    <template #no-data>
      <v-empty-state
        headline="No hay citas registradas"
        text="Cuando agendes una cita, aparecerá en esta lista con su estado y enlace de sesión."
        icon="mdi-calendar-search"
      ></v-empty-state>
    </template>

    <template #item.estado="{ value }">
      <v-chip :color="statusColor(value)" size="small" variant="tonal">
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
      <v-chip v-else size="small" variant="tonal" color="secondary">
        Pendiente
      </v-chip>
    </template>

    <template #item.sessionSummary="{ item }">
      <span class="text-body-2">
        {{ item.sessionSummary || "Pendiente" }}
      </span>
    </template>

    <template #item.actions="{ item }">
      <div class="d-flex ga-1">
        <v-btn
          icon
          variant="text"
          color="secondary"
          aria-label="Editar cita"
          :disabled="item.estado === 'realizada'"
          @click="openEditDialog(item)"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          color="success"
          aria-label="Confirmar cita"
          :disabled="item.estado === 'confirmada' || item.estado === 'realizada'"
          @click="handleConfirmAppointment(item)"
        >
          <v-icon>mdi-check-circle</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Marcar cita como realizada"
          :disabled="item.estado === 'realizada'"
          @click="handleCompleteAppointment(item)"
        >
          <v-icon>mdi-calendar-check</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          color="warning"
          aria-label="Volver cita a pendiente"
          :disabled="item.estado === 'pendiente'"
          @click="handleResetAppointment(item)"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </template>
  </v-data-table>

  <CitaDialog
    v-model="dialog"
    :terapia-id="dialogTherapy?.id || activeTherapy?.id || ''"
    :terapeuta-id="dialogTherapy?.terapeutaId || activeTherapy?.terapeutaId || ''"
    :terapeuta-nombre="dialogTherapy?.terapeutaNombre || activeTherapy?.terapeutaNombre || ''"
    :cita-id="editingAppointment?.citaId || ''"
    :initial-appointment="editingAppointment || {}"
    :redirect-on-save="false"
    @saved="loadAppointments"
  />
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import {
  confirmAppointment,
  markAppointmentAsCompleted,
  resetAppointmentToPending,
} from "@/services/citaService";
import { getTherapiesByPatient } from "@/services/terapiaService";
import {
  isTableLoadingTimeout,
  notifyTableLoadingTimeout,
  withTableLoadingTimeout,
} from "@/utils/tableLoadingTimeout";

const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);

const search = ref("");
const items = ref([]);
const loading = ref(false);
const therapies = ref([]);
const dialog = ref(false);
const editingAppointment = ref(null);
const dialogTherapy = ref(null);

const headers = [
  { title: "Fecha", key: "fechaOrden", value: "fecha" },
  { title: "Hora", value: "hora" },
  { title: "Estado", value: "estado" },
  { title: "Terapeuta", value: "terapeutaNombre" },
  { title: "Terapia", value: "terapiaNombre" },
  { title: "Sesión online", value: "meetingUrl", sortable: false },
  { title: "Resumen", value: "sessionSummary", sortable: false },
  { title: "Notas", value: "notas" },
  { title: "Confirmar", key: "actions", sortable: false },
];

const filteredItems = computed(() => {
  const q = search.value?.toString().trim().toLowerCase();
  if (!q) return items.value;

  return items.value.filter((item) => {
    const combined = [
      item.fecha,
      item.hora,
      item.estado,
      item.terapeutaNombre,
      item.terapiaNombre,
      item.notas,
      item.meetingProvider,
      item.meetingUrl,
    ]
      .join(" ")
      .toLowerCase();

    return combined.includes(q);
  });
});

const activeTherapy = computed(() =>
  therapies.value.find((therapy) => (therapy.estado || "").toString().trim().toLowerCase() === "activo") || null
);

function statusColor(status) {
  const normalized = (status || "").toString().trim().toLowerCase();

  if (normalized === "confirmada") return "success";
  if (normalized === "cancelada") return "error";
  if (normalized === "realizada" || normalized === "completada") return "primary";
  return "warning";
}

function buildSortableDate(fecha, hora) {
  if (!fecha) return "";
  return `${fecha}T${hora || "00:00"}`;
}

async function loadAppointments() {
  const pacienteUid = currentUser.value?.uid;

  if (!pacienteUid) {
    therapies.value = [];
    items.value = [];
    return;
  }

  loading.value = true;

  try {
    therapies.value = await withTableLoadingTimeout(
      getTherapiesByPatient(pacienteUid)
    );

    items.value = therapies.value.flatMap((therapy) =>
      (Array.isArray(therapy.citas) ? therapy.citas : []).map((appointment) => ({
        id: appointment.citaId || `${therapy.id}-${appointment.fecha}-${appointment.hora}`,
        fecha: appointment.fecha || "Sin fecha",
        fechaOrden: buildSortableDate(appointment.fecha, appointment.hora),
        hora: appointment.hora || "Sin hora",
        estado: appointment.estado || "pendiente",
        terapiaId: therapy.id,
        citaId: appointment.citaId || "",
        terapeutaNombre: therapy.terapeutaNombre || "No definido",
        terapiaNombre: `Terapia con ${therapy.terapeutaNombre || "terapeuta"}`,
        notas: appointment.notas || "Sin notas",
        modalidad: appointment.modalidad || "",
        ubicacion: appointment.ubicacion || "",
        meetingProvider: appointment.meetingProvider || "",
        meetingUrl: appointment.meetingUrl || "",
        sessionSummary: appointment.sessionSummary || "",
      }))
    );
  } catch (error) {
    console.error("Error loading appointments:", error);
    if (isTableLoadingTimeout(error)) {
      notifyTableLoadingTimeout(error.message);
    }
    therapies.value = [];
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function openAppointmentDialog() {
  if (!activeTherapy.value) {
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: "Necesitas una terapia activa para poder agregar una nueva cita.",
        },
      })
    );
    return;
  }

  editingAppointment.value = null;
  dialogTherapy.value = activeTherapy.value;
  dialog.value = true;
}

function openEditDialog(item) {
  if (item.estado === "realizada") {
    return;
  }

  editingAppointment.value = {
    citaId: item.citaId,
    fecha: item.fecha,
    hora: item.hora,
    notas: item.notas,
    modalidad: item.modalidad,
    ubicacion: item.ubicacion,
    meetingProvider: item.meetingProvider,
    meetingUrl: item.meetingUrl,
  };

  dialogTherapy.value = therapies.value.find((therapy) => therapy.id === item.terapiaId) || null;
  dialog.value = true;
}

async function handleConfirmAppointment(item) {
  try {
    await confirmAppointment({
      citaId: item.citaId,
      terapiaId: item.terapiaId,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Cita confirmada",
          message: "La cita fue actualizada correctamente.",
        },
      })
    );

    await loadAppointments();
  } catch (error) {
    console.error("Error confirming appointment:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo confirmar la cita.",
        },
      })
    );
  }
}

async function handleCompleteAppointment(item) {
  try {
    await markAppointmentAsCompleted({
      citaId: item.citaId,
      terapiaId: item.terapiaId,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Cita realizada",
          message: "La cita fue marcada como realizada.",
        },
      })
    );

    await loadAppointments();
  } catch (error) {
    console.error("Error completing appointment:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: "No se pudo marcar la cita como realizada.",
        },
      })
    );
  }
}

async function handleResetAppointment(item) {
  try {
    await resetAppointmentToPending({
      citaId: item.citaId,
      terapiaId: item.terapiaId,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Cita actualizada",
          message: "La cita volvió al estado pendiente.",
        },
      })
    );

    await loadAppointments();
  } catch (error) {
    console.error("Error resetting appointment:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: "No se pudo regresar la cita a pendiente.",
        },
      })
    );
  }
}

watch(
  () => currentUser.value?.uid,
  () => {
    loadAppointments();
  },
  { immediate: true }
);
</script>

<style scoped>
.appointments-table {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .appointments-action {
    width: 100%;
  }
}
</style>
