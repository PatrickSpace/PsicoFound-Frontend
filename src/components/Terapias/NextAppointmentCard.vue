<template>
  <v-card
    class="pa-4 card-backgoundcustom session-card next-session-card"
    elevation="2"
    variant="text"
  >
    <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
      <v-icon color="secondary">mdi-calendar-clock</v-icon>
      Próxima sesión
    </v-card-title>
    <v-card-text class="pt-2">
      <v-row align="stretch">
        <v-col
          cols="12"
          md="5"
          class="d-flex flex-column justify-center align-start"
        >
          <v-chip
            class="mb-3"
            :color="statusColor"
            size="small"
            variant="tonal"
          >
            {{ statusLabel }}
          </v-chip>
          <v-list-item class="session-date px-0 w-100">
            <template #prepend>
              <div class="session-day">{{ appointmentDay }}</div>
            </template>
            <v-list-item-title class="font-weight-bold text-capitalize">
              {{ appointmentMonth }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ appointmentYear }}
              {{ appointment?.hora ? `• ${appointment.hora}` : "" }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-col>

        <v-col cols="12" md="7">
          <div class="session-location h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon color="secondary" size="22">mdi-map-marker-radius</v-icon>
              <span class="text-subtitle-1 font-weight-bold">
                Ubicación y modalidad
              </span>
            </div>
            <p class="font-weight-bold mb-1">{{ appointmentLocation }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ appointmentMode }}
            </p>

            <v-alert
              v-if="isRemote"
              class="mt-2"
              :type="meetingUrl ? 'success' : 'warning'"
              variant="tonal"
              icon="mdi-video-outline"
              density="comfortable"
            >
              <div class="d-flex flex-column ga-2">
                <span>
                  {{
                    meetingUrl
                      ? "Tu enlace de sesión ya está disponible."
                      : "Tu psicólogo agregará aquí el enlace de Zoom, Google Meet u otra herramienta."
                  }}
                </span>
                <v-btn
                  v-if="meetingUrl"
                  :href="meetingUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-open-in-new"
                  class="align-self-start pf-btn-secondary"
                >
                  Entrar a la sesión
                </v-btn>
              </div>
            </v-alert>
          </div>
        </v-col>
      </v-row>
    </v-card-text>

    <v-divider class="mx-4" />

    <v-card-actions class="next-session-actions px-4 pt-4 pb-2">
      <div class="me-auto">
        <p class="next-session-action-title font-weight-bold mb-1">
          ¿Cambio de planes?
        </p>
        <p class="text-body-2 mb-0">
          Puedes cambiar el horario de tu cita pendiente o confirmada.
        </p>
      </div>
      <v-btn
        class="pf-btn-secondary"
        color="secondary"
        variant="tonal"
        prepend-icon="mdi-calendar-edit-outline"
        :disabled="!reschedulable"
        @click="emit('reschedule')"
      >
        Reprogramar
      </v-btn>
      <v-btn
        v-if="cancellable"
        class="pf-btn-ghost"
        color="error"
        variant="text"
        prepend-icon="mdi-calendar-remove-outline"
        @click="emit('cancel')"
      >
        Cancelar
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  appointment: {
    type: Object,
    required: true,
  },
  reschedulable: {
    type: Boolean,
    default: true,
  },
  cancellable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["reschedule", "cancel"]);

const appointmentDate = computed(() => {
  if (!props.appointment?.fecha) return null;

  const parsed = new Date(
    props.appointment.hora
      ? `${props.appointment.fecha}T${props.appointment.hora}`
      : `${props.appointment.fecha}T00:00`
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
});

const appointmentDay = computed(() =>
  appointmentDate.value
    ? String(appointmentDate.value.getDate()).padStart(2, "0")
    : "--"
);

const appointmentMonth = computed(() =>
  appointmentDate.value
    ? appointmentDate.value.toLocaleDateString("es-PE", { month: "long" })
    : "Sin fecha"
);

const appointmentYear = computed(
  () => appointmentDate.value?.getFullYear() || ""
);

const normalizedStatus = computed(() =>
  (props.appointment?.estado || "").toString().trim().toLowerCase()
);

const statusLabel = computed(() =>
  normalizedStatus.value === "confirmada"
    ? "Confirmada"
    : "Pendiente de confirmación"
);

const statusColor = computed(() =>
  normalizedStatus.value === "confirmada" ? "success" : "warning"
);

const appointmentLocation = computed(
  () => props.appointment?.ubicacion || "Sin ubicación definida"
);

const appointmentMode = computed(
  () => props.appointment?.modalidad || "Aún no tienes una modalidad definida"
);

const isRemote = computed(() =>
  ["remoto", "online", "remota"].includes(
    (props.appointment?.modalidad || "").toString().trim().toLowerCase()
  )
);

const meetingUrl = computed(() => props.appointment?.meetingUrl || "");
</script>

<style scoped>
.session-card {
  min-height: 100%;
}

.session-day {
  align-items: center;
  background: var(--color-primary);
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, #ffffff);
  border-radius: 8px;
  color: #ffffff;
  display: inline-flex;
  font-size: 2.4rem;
  font-weight: 700;
  height: 72px;
  justify-content: center;
  line-height: 1;
  margin-right: 14px;
  min-width: 72px;
}

.session-location {
  border-left: 1px solid rgba(var(--v-theme-border-subtle), 0.28);
  padding: 4px 0 4px 24px;
}

.next-session-actions {
  align-items: center;
  display: flex;
  gap: 20px;
}

.next-session-action-title {
  color: var(--pf-card-text) !important;
  opacity: 1 !important;
}

@media (max-width: 959px) {
  .session-location {
    border-left: 0;
    border-top: 1px solid rgba(var(--v-theme-border-subtle), 0.28);
    padding: 20px 0 0;
  }
}

@media (max-width: 599px) {
  .session-card {
    padding: 14px !important;
  }

  .session-card :deep(.v-card-title) {
    font-size: 1rem !important;
    line-height: 1.25;
  }

  .session-day {
    font-size: 2rem;
    height: 60px;
    min-width: 60px;
  }

  .next-session-actions {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }

  .next-session-actions .v-btn {
    width: 100%;
  }
}
</style>
