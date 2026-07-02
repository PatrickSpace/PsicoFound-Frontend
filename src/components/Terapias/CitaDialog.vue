<template>
  <v-dialog
    :model-value="modelValue"
    class="appointment-dialog"
    max-width="700px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="appointment-card card-backgoundcustom ma-5" elevation="2" variant="text">
      <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold">
        <v-icon color="secondary" size="small">mdi-calendar-plus-outline</v-icon>
        {{ showAvailabilityPicker ? "Solicita una cita" : citaId ? "Editar cita" : "Agendar cita" }}
      </v-card-title>
      <v-divider class="mx-4"></v-divider>
      <v-card-text class="pt-6">
        <v-container class="pa-0">
          <v-row>
            <v-col cols="12">
              <div class="text-subtitle-1 font-weight-bold">
                Terapeuta: {{ terapeutaNombre || "No definido" }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{
                  showAvailabilityPicker
                    ? "Elige uno de los horarios que el psicólogo abrió en su agenda."
                    : citaId
                      ? "Actualiza la fecha y hora de la cita."
                      : "Completa la fecha y hora para registrar la cita."
                }}
              </div>
            </v-col>

            <v-col v-if="showAvailabilityPicker" cols="12">
              <div class="appointment-therapist-card">
                <v-avatar color="secondary" variant="tonal" size="48">
                  <v-icon>mdi-account-heart-outline</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="text-caption text-medium-emphasis">
                    Psicólogo
                  </div>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ terapeutaNombre || therapist?.nombre || "Psicólogo asignado" }}
                  </div>
                </div>
                <v-chip color="secondary" variant="tonal" size="small">
                  60 min
                </v-chip>
              </div>
            </v-col>

            <v-col v-if="showAvailabilityPicker" cols="12">
              <div class="availability-filter">
                <v-btn-toggle
                  v-model="availabilityRange"
                  color="secondary"
                  divided
                  mandatory
                  variant="outlined"
                >
                  <v-btn value="week">Esta semana</v-btn>
                  <v-btn value="month">Este mes</v-btn>
                  <v-btn value="next">Próximo mes</v-btn>
                </v-btn-toggle>
              </div>

              <v-alert
                v-if="availabilityError"
                class="mt-4"
                color="error"
                variant="tonal"
                icon="mdi-alert-outline"
              >
                {{ availabilityError }}
              </v-alert>

              <div v-if="loadingAvailability" class="availability-loading">
                <v-progress-circular indeterminate color="secondary" />
                <span>Buscando horarios disponibles...</span>
              </div>

              <v-empty-state
                v-else-if="filteredAvailabilityGroups.length === 0"
                headline="No hay horarios disponibles"
                text="El psicólogo aún no abrió bloques para este periodo. Puedes revisar más tarde."
                icon="mdi-calendar-search-outline"
              ></v-empty-state>

              <div v-else class="availability-days">
                <section
                  v-for="group in filteredAvailabilityGroups"
                  :key="group.date"
                  class="availability-day"
                >
                  <div class="availability-day__header">
                    <strong>{{ group.weekday }}</strong>
                    <v-icon size="small">mdi-calendar-blank-outline</v-icon>
                    <span>{{ group.displayDate }}</span>
                  </div>
                  <div class="availability-slots">
                    <button
                      v-for="slot in group.slots"
                      :key="slot.id"
                      type="button"
                      class="availability-slot"
                      :class="{ 'availability-slot--selected': selectedSlotId === slot.id }"
                      @click="selectAvailabilitySlot(slot)"
                    >
                      <span class="availability-slot__radio"></span>
                      <span>{{ slot.startTime }} hs</span>
                    </button>
                  </div>
                </section>
              </div>
            </v-col>

            <v-col v-if="!showAvailabilityPicker" cols="12" md="6">
              <v-text-field
                v-model="form.fecha"
                label="Fecha"
                type="date"
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col v-if="!showAvailabilityPicker" cols="12" md="6">
              <v-text-field
                v-model="form.hora"
                label="Hora"
                type="time"
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                :model-value="form.modalidad"
                label="Modalidad"
                variant="outlined"
                readonly
                :loading="loadingTherapist || loadingTherapy"
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.ubicacion"
                label="Ubicación"
                variant="outlined"
                :readonly="isRemote"
                :hint="isRemote ? 'La cita se registrará como terapia online.' : 'Puedes ajustar la dirección si hace falta.'"
                persistent-hint
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col v-if="canEditMeetingLink" cols="12" md="6">
              <v-select
                v-model="form.meetingProvider"
                :items="meetingProviderOptions"
                item-title="title"
                item-value="value"
                label="Herramienta de videollamada"
                variant="outlined"
                clearable
                :disabled="!isRemote || !canEditMeetingLink"
                :hint="meetingProviderHint"
                persistent-hint
                density="comfortable"
              ></v-select>
            </v-col>

            <v-col v-if="canEditMeetingLink" cols="12" md="6">
              <v-text-field
                v-model="form.meetingUrl"
                label="URL de la sesión"
                placeholder="https://meet.google.com/... o https://zoom.us/..."
                variant="outlined"
                clearable
                :disabled="!isRemote || !canEditMeetingLink"
                :rules="[validateMeetingUrl]"
                :hint="meetingUrlHint"
                persistent-hint
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col v-else-if="isRemote" cols="12">
              <v-alert
                color="info"
                variant="tonal"
                icon="mdi-video-outline"
                density="comfortable"
              >
                El psicólogo agregará el enlace de Zoom, Google Meet u otra herramienta cuando confirme la sesión.
              </v-alert>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="form.notas"
                label="Notas para la cita"
                variant="outlined"
                rows="3"
                density="comfortable"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions class="appointment-actions px-6 pb-5">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn
          color="secondary"
          variant="tonal"
          :loading="saving"
          :disabled="!canSubmitAppointment"
          @click="submitAppointment"
        >
          {{ showAvailabilityPicker ? "Siguiente paso" : citaId ? "Guardar cambios" : "Registrar cita" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { createAppointment, updateAppointment } from "@/services/citaService";
import { getAvailableSlotsByTherapist } from "@/services/availabilityService";
import { getTherapistById } from "@/services/psicologoService";
import { getTherapyById } from "@/services/terapiaService";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  terapeutaId: {
    type: [String, Number],
    default: "",
  },
  terapeutaNombre: {
    type: String,
    default: "",
  },
  pacienteUid: {
    type: String,
    default: "",
  },
  pacienteNombre: {
    type: String,
    default: "",
  },
  pacienteEmail: {
    type: String,
    default: "",
  },
  terapiaId: {
    type: String,
    default: "",
  },
  citaId: {
    type: String,
    default: "",
  },
  initialAppointment: {
    type: Object,
    default: () => ({}),
  },
  redirectOnSave: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser, userName } = storeToRefs(authStore);
const saving = ref(false);
const loadingTherapist = ref(false);
const loadingTherapy = ref(false);
const loadingAvailability = ref(false);
const availabilityError = ref("");
const therapist = ref(null);
const therapy = ref(null);
const availabilitySlots = ref([]);
const selectedSlotId = ref("");
const availabilityRange = ref("month");
const form = reactive({
  fecha: "",
  hora: "",
  notas: "",
  modalidad: "",
  ubicacion: "",
  meetingProvider: "",
  meetingUrl: "",
});

const fallbackModalities = ["Remoto", "Presencial", "Híbrido"];
const meetingProviderOptions = [
  { title: "Google Meet", value: "google_meet" },
  { title: "Zoom", value: "zoom" },
  { title: "Microsoft Teams", value: "teams" },
  { title: "Otra herramienta", value: "other" },
];

const r = {
  optionalUrl: (value) => {
    const rawValue = (value || "").toString().trim();

    if (!rawValue) {
      return true;
    }

    try {
      const url = new URL(rawValue);
      return ["http:", "https:"].includes(url.protocol) || "Ingresa una URL valida";
    } catch {
      return "Ingresa una URL valida";
    }
  },
};

function validateMeetingUrl(value) {
  if (!canEditMeetingLink.value) {
    return true;
  }

  return r.optionalUrl(value);
}

const isRemote = computed(() => normalizeModalidad(form.modalidad) === "remoto");
const canEditMeetingLink = computed(() =>
  ["psychologist", "admin"].includes(appContext.activeMode)
);
const showAvailabilityPicker = computed(() => !canEditMeetingLink.value);
const filteredAvailabilitySlots = computed(() => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = rangeStartDate(availabilityRange.value, startOfToday);
  const end = rangeEndDate(availabilityRange.value, startOfToday);

  return availabilitySlots.value.filter((slot) => {
    const slotDate = parseDateOnly(slot.date);

    return slotDate && slotDate >= start && slotDate <= end;
  });
});
const filteredAvailabilityGroups = computed(() => {
  const groups = new Map();

  filteredAvailabilitySlots.value.forEach((slot) => {
    if (!groups.has(slot.date)) {
      groups.set(slot.date, {
        date: slot.date,
        weekday: formatWeekday(slot.date),
        displayDate: formatDisplayDate(slot.date),
        slots: [],
      });
    }

    groups.get(slot.date).slots.push(slot);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    slots: group.slots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
});
const canSubmitAppointment = computed(() => {
  if (!props.terapeutaId || !form.modalidad || !form.ubicacion) {
    return false;
  }

  if (showAvailabilityPicker.value) {
    return Boolean(selectedSlotId.value);
  }

  return Boolean(form.fecha && form.hora);
});
const meetingProviderHint = computed(() => {
  if (!isRemote.value) {
    return "Disponible para citas remotas.";
  }

  return canEditMeetingLink.value
    ? "El paciente verá la herramienta cuando esté disponible."
    : "El psicólogo completará la herramienta antes de la sesión.";
});
const meetingUrlHint = computed(() => {
  if (!isRemote.value) {
    return "Solo aplica a modalidad remota.";
  }

  return canEditMeetingLink.value
    ? "El paciente verá el enlace cuando esté disponible."
    : "El psicólogo agregará el enlace de Zoom, Google Meet u otra herramienta.";
});
const meetingProviderForSave = computed(() => {
  if (!isRemote.value) {
    return "";
  }

  return canEditMeetingLink.value
    ? form.meetingProvider
    : props.initialAppointment?.meetingProvider || "";
});
const meetingUrlForSave = computed(() => {
  if (!isRemote.value) {
    return "";
  }

  return canEditMeetingLink.value
    ? form.meetingUrl.trim()
    : props.initialAppointment?.meetingUrl || "";
});

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      await loadSources();
      form.fecha = props.initialAppointment?.fecha || "";
      form.hora = props.initialAppointment?.hora || "";
      form.notas = props.initialAppointment?.notas || "";
      form.modalidad =
        normalizeDisplayModalidad(props.initialAppointment?.modalidad) ||
        resolveModalidad() ||
        "";
      form.ubicacion =
        props.initialAppointment?.ubicacion ||
        defaultLocationForModalidad(form.modalidad);
      form.meetingProvider = props.initialAppointment?.meetingProvider || "";
      form.meetingUrl = props.initialAppointment?.meetingUrl || "";
      selectedSlotId.value = props.initialAppointment?.availabilitySlotId || "";

      if (showAvailabilityPicker.value) {
        await loadAvailabilitySlots();
      }
    }
  }
);

watch(
  () => form.modalidad,
  (value, previousValue) => {
    const normalizedCurrent = normalizeModalidad(value);
    const normalizedPrevious = normalizeModalidad(previousValue);

    if (normalizedCurrent === "remoto") {
      form.ubicacion = "Terapia Online";
      return;
    }

    form.meetingProvider = "";
    form.meetingUrl = "";

    if (
      !form.ubicacion ||
      form.ubicacion === "Terapia Online" ||
      normalizedPrevious === "remoto"
    ) {
      form.ubicacion = therapist.value?.direccion || "";
    }
  }
);

watch(
  () => props.terapeutaId,
  async () => {
    if (props.modelValue) {
      await loadSources();
    }
  }
);

watch(
  () => props.terapiaId,
  async () => {
    if (props.modelValue) {
      await loadSources();
    }
  }
);

function normalizeModalidad(value) {
  const normalized = (value || "").toString().trim().toLowerCase();

  if (["remoto", "online", "remota"].includes(normalized)) return "remoto";
  if (["presencial", "precencial"].includes(normalized)) return "presencial";
  if (["hibrido", "híbrido", "hibrida", "híbrida"].includes(normalized)) {
    return "hibrido";
  }

  return normalized;
}

function normalizeDisplayModalidad(value) {
  const normalized = normalizeModalidad(value);

  if (normalized === "remoto") return "Remoto";
  if (normalized === "presencial") return "Presencial";
  if (normalized === "hibrido") return "Híbrido";

  return value || "";
}

function defaultLocationForModalidad(modalidad) {
  if (normalizeModalidad(modalidad) === "remoto") {
    return "Terapia Online";
  }

  return therapist.value?.direccion || "";
}

function resolveModalidad() {
  if (therapy.value?.modalidad) {
    return normalizeDisplayModalidad(therapy.value.modalidad);
  }

  if (
    Array.isArray(therapist.value?.modalidades) &&
    therapist.value.modalidades.length > 0
  ) {
    return normalizeDisplayModalidad(therapist.value.modalidades[0]);
  }

  return normalizeDisplayModalidad(fallbackModalities[0]);
}

async function loadTherapist() {
  therapist.value = null;

  if (!props.terapeutaId) {
    return;
  }

  loadingTherapist.value = true;

  try {
    therapist.value = await getTherapistById(props.terapeutaId);
  } catch (error) {
    console.error("Error loading therapist for appointment dialog:", error);
    therapist.value = null;
  } finally {
    loadingTherapist.value = false;
  }
}

async function loadTherapy() {
  therapy.value = null;

  if (!props.terapiaId) {
    return;
  }

  loadingTherapy.value = true;

  try {
    therapy.value = await getTherapyById(props.terapiaId);
  } catch (error) {
    console.error("Error loading therapy for appointment dialog:", error);
    therapy.value = null;
  } finally {
    loadingTherapy.value = false;
  }
}

async function loadSources() {
  await Promise.all([loadTherapist(), loadTherapy()]);
}

async function loadAvailabilitySlots() {
  if (!props.terapeutaId) {
    availabilitySlots.value = [];
    return;
  }

  loadingAvailability.value = true;
  availabilityError.value = "";

  try {
    availabilitySlots.value = await getAvailableSlotsByTherapist(props.terapeutaId);

    if (!selectedSlotId.value && availabilitySlots.value.length === 1) {
      selectAvailabilitySlot(availabilitySlots.value[0]);
    } else if (selectedSlotId.value) {
      const currentSlot = availabilitySlots.value.find(
        (slot) => slot.id === selectedSlotId.value
      );

      if (currentSlot) {
        applySlotToForm(currentSlot);
      }
    }
  } catch (error) {
    console.error("Error loading therapist availability:", error);
    availabilitySlots.value = [];
    availabilityError.value =
      error?.message || "No pudimos cargar los horarios disponibles.";
  } finally {
    loadingAvailability.value = false;
  }
}

function selectAvailabilitySlot(slot) {
  selectedSlotId.value = slot.id;
  applySlotToForm(slot);
}

function applySlotToForm(slot) {
  form.fecha = slot.date || "";
  form.hora = slot.startTime || "";
  form.modalidad = normalizeDisplayModalidad(slot.modality || slot.modalidad || form.modalidad);
  form.ubicacion = slot.location || defaultLocationForModalidad(form.modalidad);
}

async function submitAppointment() {
  if (!canSubmitAppointment.value) {
    return;
  }

  const meetingUrlValidation = validateMeetingUrl(form.meetingUrl);

  if (meetingUrlValidation !== true) {
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: meetingUrlValidation,
        },
      })
    );
    return;
  }

  if (!currentUser.value?.uid) {
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: "Necesitas iniciar sesión para registrar una cita.",
        },
      })
    );
    return;
  }

  saving.value = true;

  try {
    let savedAppointment = null;

    if (props.citaId) {
      savedAppointment = await updateAppointment({
        citaId: props.citaId,
        terapiaId: props.terapiaId || "",
        fecha: form.fecha,
        hora: form.hora,
        notas: form.notas,
        modalidad: normalizeDisplayModalidad(form.modalidad),
        ubicacion: form.ubicacion,
        meetingProvider: meetingProviderForSave.value,
        meetingUrl: meetingUrlForSave.value,
        availabilitySlotId: selectedSlotId.value,
      });
    } else {
      const appointmentPatientUid = props.pacienteUid || currentUser.value.uid;
      savedAppointment = await createAppointment({
        terapiaId: props.terapiaId || "",
        usuarioId: appointmentPatientUid,
        terapeutaId: props.terapeutaId,
        terapeutaNombre: props.terapeutaNombre,
        pacienteUid: appointmentPatientUid,
        pacienteNombre: props.pacienteNombre || userName.value || "Usuario",
        pacienteEmail: props.pacienteEmail || currentUser.value?.email || "",
        fecha: form.fecha,
        hora: form.hora,
        notas: form.notas,
        modalidad: normalizeDisplayModalidad(form.modalidad),
        ubicacion: form.ubicacion,
        meetingProvider: meetingProviderForSave.value,
        meetingUrl: meetingUrlForSave.value,
        availabilitySlotId: selectedSlotId.value,
        estado: "pendiente",
      });
    }

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: props.citaId ? "Cita actualizada" : "Cita registrada",
          message: props.citaId
            ? `La cita con ${props.terapeutaNombre} fue actualizada correctamente.`
            : `Tu cita con ${props.terapeutaNombre} fue guardada. El psicólogo podrá confirmar y agregar el enlace de la sesión.`,
        },
      })
    );

    emit("saved", savedAppointment);
    emit("update:modelValue", false);
    if (props.redirectOnSave) {
      router.push("/sesiones");
    }
  } catch (error) {
    console.error("Error registrando cita:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message:
            error?.message || "No se pudo registrar la cita. Intenta nuevamente.",
        },
      })
    );
  } finally {
    saving.value = false;
  }
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rangeEndDate(range, startDate) {
  const end = new Date(startDate);

  if (range === "week") {
    end.setDate(end.getDate() + 7);
    return end;
  }

  if (range === "next") {
    return new Date(end.getFullYear(), end.getMonth() + 2, 0);
  }

  return new Date(end.getFullYear(), end.getMonth() + 1, 0);
}

function rangeStartDate(range, startDate) {
  if (range === "next") {
    return new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
  }

  return startDate;
}

function formatWeekday(date) {
  const parsed = parseDateOnly(date);

  if (!parsed) {
    return "Fecha";
  }

  return new Intl.DateTimeFormat("es", { weekday: "long" })
    .format(parsed)
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDisplayDate(date) {
  const parsed = parseDateOnly(date);

  if (!parsed) {
    return date || "";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}
</script>

<style scoped>
.appointment-card {
  color: rgba(255, 255, 255, 0.94);
}

.appointment-card :deep(.v-card-title),
.appointment-card :deep(.text-subtitle-1),
.appointment-card :deep(.v-field__input),
.appointment-card :deep(.v-text-field input),
.appointment-card :deep(textarea) {
  color: rgba(255, 255, 255, 0.94) !important;
}

.appointment-card :deep(.text-medium-emphasis),
.appointment-card :deep(.v-label),
.appointment-card :deep(.v-field-label),
.appointment-card :deep(.v-messages__message) {
  color: rgba(255, 255, 255, 0.72) !important;
  opacity: 1;
}

.appointment-card :deep(.v-field) {
  background-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.94);
}

.appointment-card :deep(.v-field__outline) {
  color: rgba(210, 244, 241, 0.34);
}

.appointment-card :deep(.v-alert) {
  background-color: rgba(95, 128, 123, 0.24) !important;
  color: rgba(255, 255, 255, 0.88) !important;
}

.appointment-therapist-card {
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(210, 244, 241, 0.16);
  border-radius: 14px;
  display: flex;
  gap: 14px;
  padding: 14px;
}

.availability-filter {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.availability-filter :deep(.v-btn-toggle) {
  border-radius: 14px;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px;
}

.availability-filter :deep(.v-btn) {
  border-radius: 12px !important;
  min-width: 120px;
}

.availability-loading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 28px 0;
}

.availability-days {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.availability-day {
  border-top: 1px solid rgba(210, 244, 241, 0.16);
  padding-top: 18px;
}

.availability-day__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.availability-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.availability-slot {
  align-items: center;
  background: transparent;
  border: 1px solid rgba(210, 244, 241, 0.18);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  display: inline-flex;
  gap: 9px;
  min-height: 40px;
  padding: 8px 14px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.availability-slot:hover,
.availability-slot--selected {
  background: rgba(95, 128, 123, 0.28);
  border-color: rgba(158, 198, 189, 0.76);
  color: rgba(255, 255, 255, 0.96);
}

.availability-slot__radio {
  border: 2px solid currentColor;
  border-radius: 50%;
  display: inline-block;
  height: 16px;
  position: relative;
  width: 16px;
}

.availability-slot--selected .availability-slot__radio::after {
  background: currentColor;
  border-radius: 50%;
  content: "";
  inset: 3px;
  position: absolute;
}

:global(.v-theme--light) .appointment-card {
  color: rgb(var(--v-theme-on-surface));
}

:global(.v-theme--light) .appointment-card :deep(.v-card-title),
:global(.v-theme--light) .appointment-card :deep(.text-subtitle-1),
:global(.v-theme--light) .appointment-card :deep(.v-field__input),
:global(.v-theme--light) .appointment-card :deep(.v-text-field input),
:global(.v-theme--light) .appointment-card :deep(textarea) {
  color: rgba(18, 33, 30, 0.92) !important;
}

:global(.v-theme--light) .appointment-card :deep(.text-medium-emphasis),
:global(.v-theme--light) .appointment-card :deep(.v-label),
:global(.v-theme--light) .appointment-card :deep(.v-field-label),
:global(.v-theme--light) .appointment-card :deep(.v-messages__message) {
  color: rgba(18, 33, 30, 0.68) !important;
}

:global(.v-theme--light) .appointment-card :deep(.v-field) {
  background-color: rgba(255, 255, 255, 0.88);
}

:global(.v-theme--light) .appointment-card :deep(.v-field__outline) {
  color: rgba(18, 58, 53, 0.28);
}

:global(.v-theme--light) .appointment-therapist-card {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(18, 58, 53, 0.14);
}

:global(.v-theme--light) .availability-day {
  border-top-color: rgba(18, 58, 53, 0.14);
}

:global(.v-theme--light) .availability-slot {
  border-color: rgba(18, 58, 53, 0.22);
  color: rgba(18, 33, 30, 0.82);
}

:global(.v-theme--light) .availability-slot:hover,
:global(.v-theme--light) .availability-slot--selected {
  background: rgba(47, 102, 95, 0.12);
  border-color: rgba(47, 102, 95, 0.58);
  color: rgba(18, 58, 53, 0.94);
}

@media (max-width: 600px) {
  .appointment-dialog :deep(.v-overlay__content) {
    width: calc(100% - 20px) !important;
    max-height: calc(100dvh - 20px);
    margin: 10px;
  }

  .appointment-card {
    margin: 0 !important;
  }

  .appointment-card :deep(.v-card-title) {
    font-size: 1.25rem;
    line-height: 1.25;
  }

  .appointment-card :deep(.v-card-text) {
    padding-inline: 12px;
  }

  .appointment-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .appointment-actions :deep(.v-btn) {
    flex: 1 1 100%;
  }

  .availability-filter {
    justify-content: flex-start;
  }

  .availability-filter :deep(.v-btn-toggle) {
    width: 100%;
  }

  .availability-filter :deep(.v-btn) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .availability-slots {
    flex-wrap: nowrap;
    margin-inline: -12px;
    overflow-x: auto;
    padding: 0 12px 4px;
  }

  .availability-slot {
    flex: 0 0 auto;
  }
}
</style>
