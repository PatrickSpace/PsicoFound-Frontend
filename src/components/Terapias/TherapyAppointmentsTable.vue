<template>
  <v-data-table
    :headers="headers"
    :items="appointmentItems"
    class="card-backgoundcustom therapy-appointments-table"
    :items-per-page="itemsPerPage"
  >
    <template #no-data>
      <v-empty-state
        headline="Aún no hay citas asociadas"
        text="Agenda la primera sesión para iniciar el seguimiento del proceso."
        icon="mdi-calendar-search"
      />
    </template>
    <template #item.estado="{ value }">
      <v-chip size="small" variant="tonal" :color="statusColor(value)">
        {{ value || "pendiente" }}
      </v-chip>
    </template>
    <template #item.meetingUrl="{ item }">
      <a
        v-if="item.meetingUrl"
        :href="item.meetingUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="session-link"
      >
        Enlace listo
      </a>
      <v-chip v-else size="small" variant="tonal" color="secondary">
        Pendiente
      </v-chip>
    </template>
  </v-data-table>
</template>

<script setup>
import { computed } from "vue";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();

const props = defineProps({
  appointments: {
    type: Array,
    default: () => [],
  },
});

const headers = [
  { title: "Fecha", value: "fecha" },
  { title: "Hora", value: "hora" },
  { title: "Estado", value: "estado" },
  { title: "Modalidad", value: "modalidad" },
  { title: "Enlace de sesión", value: "meetingUrl", sortable: false },
  { title: "Notas", value: "notas" },
];

const itemsPerPage = computed(() =>
  appContext.activeMode === "patient" ? 25 : 10
);

const appointmentItems = computed(() =>
  props.appointments.map((appointment) => ({
    citaId:
      appointment.citaId ||
      `${appointment.fecha || "sin-fecha"}-${appointment.hora || "sin-hora"}`,
    fecha: appointment.fecha || "Sin fecha",
    hora: appointment.hora || "Sin hora",
    estado: appointment.estado || "pendiente",
    modalidad: appointment.modalidad || "No definida",
    meetingUrl: appointment.meetingUrl || "",
    notas: appointment.notas || "Sin notas",
  }))
);

function statusColor(status) {
  const normalized = (status || "").toString().trim().toLowerCase();

  if (normalized === "confirmada") return "success";
  if (normalized === "cancelada" || normalized === "finalizado") return "error";
  if (normalized === "realizada" || normalized === "completada") return "primary";
  return "secondary";
}
</script>

<style scoped>
.session-link {
  color: rgb(var(--v-theme-secondary));
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.session-link:hover,
.session-link:focus-visible {
  color: rgb(var(--v-theme-primary));
}
</style>

