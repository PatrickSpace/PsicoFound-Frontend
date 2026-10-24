<template>
  <v-dialog
    :model-value="modelValue"
    class="appointment-dialog bg-transparent"
    max-width="640px"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="appointment-card card-backgoundcustom ma-5" elevation="2" variant="text">
      <div class="appointment-topbar">
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          color="secondary"
          aria-label="Volver"
          @click="emit('update:modelValue', false)"
          class="pf-btn-icon"
        />
        <div class="appointment-topbar__title">
          {{ appointmentDialogTitle }}
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="secondary"
          aria-label="Cerrar"
          @click="emit('update:modelValue', false)"
          class="pf-btn-icon"
        />
      </div>

      <v-card-text class="appointment-body">
        <v-container class="pa-0">
          <p class="text-caption mb-3">{{ AGENDA_NOTICE }}</p>
          <v-row>
            <v-col v-if="!showAvailabilityPicker" cols="12">
              <div class="text-subtitle-1 font-weight-bold">
                Terapeuta: {{ terapeutaNombre || "No definido" }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ citaId ? "Actualiza la fecha y hora de la cita." : "Completa la fecha y hora para registrar la cita." }}
              </div>
            </v-col>

            <v-col v-if="showAvailabilityPicker && !bookingQuote" cols="12">
              <div class="appointment-therapist-card">
                <v-avatar class="appointment-therapist-card__avatar" size="58">
                  <v-icon size="34">mdi-account-heart-outline</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="text-caption text-medium-emphasis">
                    {{ therapistSpecialty }}
                  </div>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ terapeutaNombre || therapist?.nombre || "Psicólogo asignado" }}
                  </div>
                  <div class="appointment-therapist-card__meta">
                    <v-icon size="16">mdi-clock-outline</v-icon>
                    Bloques de 60 min
                  </div>
                </div>
                <v-chip color="secondary" variant="tonal" size="small">
                  60 min
                </v-chip>
              </div>
            </v-col>

            <v-col v-if="showAvailabilityPicker && !bookingQuote" cols="12">
              <div class="appointment-location-card">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ selectedSlotLocation }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ selectedSlotModalityLabel }}
                  </div>
                </div>
                <v-icon color="secondary">mdi-chevron-down</v-icon>
              </div>
            </v-col>

            <v-col v-if="showAvailabilityPicker && !bookingQuote" cols="12">
              <div class="availability-filter">
                <button
                  v-for="option in availabilityRangeOptions"
                  :key="option.value"
                  type="button"
                  class="availability-range"
                  :class="{ 'availability-range--selected': availabilityRange === option.value }"
                  @click="availabilityRange = option.value"
                >
                  {{ option.title }}
                  <v-icon v-if="availabilityRange === option.value" size="18">
                    mdi-close
                  </v-icon>
                </button>
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
                      <span>{{ slot.startTime }} · hora de Lima</span>
                    </button>
                  </div>
                </section>
              </div>
            </v-col>

            <v-col v-if="form.fecha && form.hora" cols="12">
              <v-alert type="info" variant="tonal">
                Horario de la cita: {{ form.fecha }} · {{ form.hora }} · hora de Lima.
                {{ AGENDA_NOTICE }}
              </v-alert>
            </v-col>

            <v-col v-if="bookingQuote" cols="12">
              <v-card class="booking-quote pa-4" variant="outlined">
                <div class="d-flex align-center justify-space-between ga-3 mb-3">
                  <div>
                    <div class="text-caption text-medium-emphasis">
                      Cotización para esta reserva
                    </div>
                    <div class="text-h5 font-weight-bold">
                      {{ formatPaymentAmount(bookingQuote.amountMinor) }}
                    </div>
                  </div>
                  <v-chip color="secondary" variant="tonal">
                    {{ bookingQuote.currency }}
                  </v-chip>
                </div>
                <v-list class="bg-transparent" density="compact">
                  <v-list-item title="Tarifa" :subtitle="bookingQuote.name" />
                  <v-list-item
                    title="Profesional"
                    :subtitle="terapeutaNombre || therapist?.nombre"
                  />
                  <v-list-item
                    title="Horario"
                  >
                    <p class="text-body-2 text-medium-emphasis text-wrap mb-0" data-testid="booking-quote-schedule">
                      {{ form.fecha }} · {{ form.hora }} · hora de Lima · {{ form.modalidad }}
                    </p>
                  </v-list-item>
                  <v-list-item
                    title="Conciliación"
                    subtitle="Administrativa y manual contra una operación verificable del proveedor"
                  />
                </v-list>
                <v-alert
                  v-if="bookingQuote.isTest"
                  color="warning"
                  variant="tonal"
                  class="mb-3"
                >
                  Tarifa marcada como prueba. No abras el enlace durante pruebas
                  automatizadas; el enlace puede representar un cobro real.
                </v-alert>
                <p class="text-caption text-medium-emphasis mb-2">
                  Al confirmar se reservará el bloque y se creará una operación
                  pendiente con esta tarifa y versión. Abrir el enlace o volver
                  a Lurems no acredita el pago.
                </p>
                <v-alert color="info" variant="tonal" class="mb-3" density="compact">
                  Al confirmar la cita, autorizas a compartir con este psicólogo el resumen que aprobaste y el historial completo de esta conversación. Su acceso se retirará si cancelas la cita.
                </v-alert>
                <p class="text-caption text-medium-emphasis mb-0">
                  Política {{ bookingQuote.commercialPolicy.version }}.
                  Plazo para informar el pago: {{ bookingQuote.conditions.holdMinutes }} minutos
                  como máximo, antes del inicio de la cita.
                  Cancelación: hasta {{ bookingQuote.conditions.patientCancellationCutoffMinutes }} minutos antes.
                  Reprogramación: hasta {{ bookingQuote.conditions.patientRescheduleCutoffMinutes }} minutos antes.
                  {{ bookingQuote.commercialPolicy.patientPastCancellation === 'allow'
                    ? 'Una cita pasada abierta también admite cancelación explícita.'
                    : 'Una cita pasada requiere revisión de soporte para cancelarla.' }}
                  {{ bookingQuote.commercialPolicy.patientPastReschedule === 'allow'
                    ? 'Una cita pasada abierta admite reprogramación si el plazo de pago sigue vigente.'
                    : 'Reprogramar una cita pasada requiere revisión de soporte.' }}
                  Las devoluciones requieren revisión; no se realizan automáticamente.
                  {{ bookingQuote.conditions.submittedExpiration === 'preserve_for_review'
                    ? 'El pago informado queda pendiente de conciliación sin vencer automáticamente.'
                    : 'Informar el pago no extiende el plazo de reserva.' }}
                </p>
                <v-btn
                  class="mt-3 pf-btn-ghost"
                  color="secondary"
                  variant="text"
                  prepend-icon="mdi-arrow-left"
                  @click="bookingQuote = null"
                >
                  Cambiar horario
                </v-btn>
              </v-card>
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

            <v-col v-if="!showAvailabilityPicker" cols="12" md="6">
              <v-text-field
                :model-value="form.modalidad"
                label="Modalidad"
                variant="outlined"
                readonly
                :loading="loadingTherapist || loadingTherapy"
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col v-if="!showAvailabilityPicker" cols="12" md="6">
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
                type="info"
                variant="tonal"
                icon="mdi-video-outline"
                density="comfortable"
              >
                El psicólogo agregará el enlace de Zoom, Google Meet u otra herramienta cuando confirme la sesión.
              </v-alert>
            </v-col>

            <v-col v-if="!bookingQuote" cols="12">
              <v-textarea
                v-model="form.notas"
                :label="showAvailabilityPicker ? 'Notas para el psicólogo' : 'Notas para la cita'"
                variant="outlined"
                :rows="showAvailabilityPicker ? 2 : 3"
                density="comfortable"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions class="appointment-actions px-6 pb-5">
        <v-btn
          color="secondary"
          variant="tonal"
          block
          :loading="saving || loadingQuote"
          :disabled="!canSubmitAppointment"
          @click="handlePrimaryAction"

        class="pf-btn-secondary">
          {{ primaryActionLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useAgendaClock } from "@/composables/useAgendaClock";
const agendaNow = useAgendaClock();
import { DEFAULT_TIME_ZONE, AGENDA_NOTICE, agendaPresentation, inAgendaRange } from "@/utils/dateTime";
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import {
  createAppointment,
  createOperationId,
  updateAppointment,
} from "@/services/citaService";
import { getAvailableSlotsByTherapist } from "@/services/availabilityService";
import { getTherapistById } from "@/services/psicologoService";
import { getTherapyById } from "@/services/terapiaService";
import { getBookingQuote } from "@/services/paymentService";
import { formatPaymentAmount } from "@/utils/paymentRates";

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
const loadingQuote = ref(false);
const availabilityError = ref("");
const therapist = ref(null);
const therapy = ref(null);
const availabilitySlots = ref([]);
const selectedSlotId = ref("");
const operationRequestId = ref("");
const bookingQuote = ref(null);
const availabilityRange = ref("month");
const form = reactive({
  fecha: "",
  hora: "",
  notas: "",
  modalidad: "",
  ubicacion: "",
  meetingProvider: null,
  meetingUrl: "",
});

const fallbackModalities = ["Remoto", "Presencial", "Híbrido"];
const availabilityRangeOptions = [
  { title: "Esta semana", value: "week" },
  { title: "Este mes", value: "month" },
  { title: "Próximo mes", value: "next" },
];
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
const appointmentDialogTitle = computed(() => {
  if (!showAvailabilityPicker.value) {
    return props.citaId ? "Editar cita" : "Agendar cita";
  }

  const modality = normalizeModalidad(form.modalidad);
  if (modality === "presencial") return "Solicita una cita presencial";
  if (modality === "remoto") return "Solicita una cita online";
  if (modality === "hibrido") return "Solicita una cita";

  return "Solicita una cita";
});
const selectedSlot = computed(() =>
  availabilitySlots.value.find((slot) => slot.id === selectedSlotId.value) || null
);
const scheduleTimeZone = computed(() => DEFAULT_TIME_ZONE);
const selectedSlotLocation = computed(() => {
  const slotLocation = selectedSlot.value?.location || form.ubicacion;

  if (slotLocation) {
    return slotLocation;
  }

  if (isRemote.value) {
    return "Terapia Online";
  }

  return "Ubicación por confirmar";
});
const selectedSlotModalityLabel = computed(() => {
  const modality = normalizeDisplayModalidad(
    selectedSlot.value?.modality || selectedSlot.value?.modalidad || form.modalidad
  );

  return modality ? `Modalidad ${modality.toLowerCase()}` : "Elige un horario disponible";
});
const therapistSpecialty = computed(() => {
  const rawSpecialty =
    therapist.value?.especialidad ||
    therapist.value?.especialidades?.[0] ||
    therapist.value?.enfoques?.[0] ||
    "Psicología";

  return rawSpecialty;
});
const filteredAvailabilitySlots = computed(() => availabilitySlots.value.filter((slot) =>
  inAgendaRange(slot, availabilityRange.value, agendaNow.value)));
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
    return Boolean(bookingQuote.value || selectedSlotId.value);
  }

  return Boolean(form.fecha && form.hora);
});
const requiresBookingQuote = computed(
  () => showAvailabilityPicker.value && !props.citaId
);
const primaryActionLabel = computed(() => {
  if (requiresBookingQuote.value && !bookingQuote.value) {
    return "Revisar cotización";
  }
  if (requiresBookingQuote.value) return "Confirmar reserva";
  if (props.citaId) return "Guardar cambios";
  return "Registrar cita";
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
    ? form.meetingProvider || ""
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
      agendaNow.value = new Date();
      bookingQuote.value = null;
      operationRequestId.value = createOperationId(
        props.citaId ? "appointment_update" : "appointment_reserve"
      );
      await loadSources();
      form.fecha = props.initialAppointment ? agendaPresentation(props.initialAppointment).fecha : "";
      form.hora = props.initialAppointment ? agendaPresentation(props.initialAppointment).hora : "";
      form.notas = props.initialAppointment?.notas || "";
      form.modalidad =
        normalizeDisplayModalidad(props.initialAppointment?.modalidad) ||
        resolveModalidad() ||
        "";
      form.ubicacion =
        props.initialAppointment?.ubicacion ||
        defaultLocationForModalidad(form.modalidad);
      form.meetingProvider = props.initialAppointment?.meetingProvider || null;
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

    form.meetingProvider = null;
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
  bookingQuote.value = null;
  selectedSlotId.value = slot.id;
  applySlotToForm(slot);
}

async function handlePrimaryAction() {
  if (requiresBookingQuote.value && !bookingQuote.value) {
    await loadBookingQuote();
    return;
  }
  await submitAppointment();
}

async function loadBookingQuote() {
  if (!selectedSlotId.value || loadingQuote.value) return;
  loadingQuote.value = true;
  try {
    bookingQuote.value = await getBookingQuote(props.terapeutaId, selectedSlotId.value);
  } catch (error) {
    window.dispatchEvent(new CustomEvent("api-error", {
      detail: {
        message: error?.message || "No pudimos preparar la cotización.",
      },
    }));
  } finally {
    loadingQuote.value = false;
  }
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
        availabilitySlotId: showAvailabilityPicker.value ? selectedSlotId.value : "",
        timeZone: scheduleTimeZone.value,
        reschedule:
          form.fecha !== (props.initialAppointment ? agendaPresentation(props.initialAppointment).fecha : "") ||
          form.hora !== (props.initialAppointment ? agendaPresentation(props.initialAppointment).hora : "") ||
          selectedSlotId.value !==
            (props.initialAppointment?.availabilitySlotId || ""),
        requestId: operationRequestId.value,
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
        timeZone: scheduleTimeZone.value,
        mode: appContext.activeMode,
        requestId: operationRequestId.value,
        quoteId: bookingQuote.value?.quoteId || "",
        shareSurveyHistoryConsent: appContext.activeMode === "patient",
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
    operationRequestId.value = "";
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

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWeekday(date) {
  const parsed = parseDateOnly(date);

  if (!parsed) {
    return "Fecha";
  }

  return new Intl.DateTimeFormat("es", { weekday: "long", timeZone: "UTC" })
    .format(parsed)
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDisplayDate(date) {
  const parsed = parseDateOnly(date);

  if (!parsed) {
    return date || "";
  }

  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}
</script>

<style scoped>
.appointment-card {
  color: rgba(var(--v-theme-text-primary), 0.94);
  overflow: hidden;
}

.appointment-topbar {
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-border-subtle), 0.14);
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  min-height: 68px;
  padding: 10px 16px;
}

.appointment-topbar__title {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0;
  text-align: center;
}

.appointment-body {
  padding: 18px 24px 10px !important;
}

.appointment-card :deep(.v-card-title),
.appointment-card :deep(.text-subtitle-1) {
  color: rgba(var(--v-theme-text-primary), 0.94) !important;
}

.appointment-card :deep(.text-medium-emphasis),
.appointment-card :deep(.v-messages__message) {
  color: rgba(var(--v-theme-text-secondary), 0.72) !important;
  opacity: 1;
}

.appointment-therapist-card {
  align-items: center;
  background: rgba(var(--v-theme-surface-glass), 0.18);
  border: 1px solid rgba(var(--v-theme-border-subtle), 0.16);
  border-radius: 16px;
  display: flex;
  gap: 14px;
  padding: 16px;
}

.appointment-therapist-card__avatar {
  background: rgba(var(--v-theme-secondary), 0.24);
  color: rgb(var(--v-theme-on-secondary));
}

.appointment-therapist-card__meta {
  align-items: center;
  color: rgba(var(--v-theme-text-secondary), 0.68);
  display: inline-flex;
  font-size: 0.86rem;
  gap: 5px;
  margin-top: 4px;
}

.appointment-location-card {
  align-items: center;
  background: rgba(var(--v-theme-surface-glass), 0.12);
  border: 1px solid rgba(var(--v-theme-border-subtle), 0.28);
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  min-height: 64px;
  padding: 12px 16px;
}

.availability-filter {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.availability-range {
  align-items: center;
  background: var(--color-button-secondary-bg);
  border: 1.5px solid color-mix(in srgb, var(--color-primary) 26%, transparent);
  border-radius: 12px;
  color: var(--color-primary-dark);
  cursor: pointer;
  display: inline-flex;
  flex: 1 0 auto;
  font: inherit;
  font-weight: 700;
  gap: 8px;
  justify-content: center;
  min-height: 52px;
  min-width: 132px;
  padding: 0 16px;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.availability-range--selected {
  background: var(--color-primary-soft);
  border-color: color-mix(in srgb, var(--color-primary) 52%, transparent);
  color: var(--color-primary-dark);
}

.availability-range:hover,
.availability-range:focus-visible {
  background: var(--color-primary-soft);
  border-color: color-mix(in srgb, var(--color-primary) 52%, transparent);
  outline: none;
  transform: translateY(-1px);
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
  gap: 0;
}

.availability-day {
  border-top: 1px solid rgba(var(--v-theme-border-subtle), 0.16);
  padding: 24px 0;
}

.availability-day__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  font-size: 1.08rem;
}

.availability-slots {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 4px;
}

.availability-slot {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: rgb(var(--v-theme-text-primary));
  cursor: pointer;
  display: inline-flex;
  gap: 9px;
  justify-content: center;
  min-height: 40px;
  min-width: 116px;
  padding: 8px 18px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.availability-slot:hover,
.availability-slot:focus-visible,
.availability-slot--selected {
  background: var(--color-button-secondary-hover);
  border-color: color-mix(in srgb, var(--color-primary) 42%, transparent);
  color: var(--color-primary-dark);
  outline: none;
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

:global(.v-theme--light .appointment-card) {
  color: rgb(var(--v-theme-on-surface));
}

:global(.v-theme--light .appointment-topbar) {
  border-bottom-color: rgba(var(--v-theme-border-subtle), var(--pf-border-subtle-alpha));
}

:global(.v-theme--light .appointment-card .v-card-title),
:global(.v-theme--light .appointment-card .text-subtitle-1) {
  color: rgba(var(--v-theme-text-primary), 0.92) !important;
}

:global(.v-theme--light .appointment-card .text-medium-emphasis),
:global(.v-theme--light .appointment-card .v-messages__message) {
  color: rgba(var(--v-theme-text-secondary), 0.68) !important;
}

:global(.v-theme--light .appointment-therapist-card) {
  background: rgba(var(--v-theme-surface-glass), 0.98);
  border-color: rgba(var(--v-theme-border-subtle), var(--pf-border-subtle-alpha));
}

:global(.v-theme--light .appointment-therapist-card__meta) {
  color: rgba(var(--v-theme-text-secondary), 0.62);
}

:global(.v-theme--light .appointment-location-card) {
  background: rgba(var(--v-theme-surface-glass), 0.98);
  border-color: rgba(var(--v-theme-border-subtle), var(--pf-border-subtle-alpha));
}

:global(.v-theme--light .availability-range) {
  background: var(--color-button-secondary-bg);
  border-color: color-mix(in srgb, var(--color-primary) 26%, transparent);
  color: var(--color-primary-dark);
}

:global(.v-theme--light .availability-range--selected) {
  background: var(--color-primary-soft);
  border-color: color-mix(in srgb, var(--color-primary) 52%, transparent);
  color: var(--color-primary-dark);
}

:global(.v-theme--light .availability-day) {
  border-top-color: rgba(var(--v-theme-border-subtle), 0.14);
}

:global(.v-theme--light .availability-slot) {
  border-color: transparent;
  color: rgb(var(--v-theme-text-primary));
}

:global(.v-theme--light .availability-slot:hover),
:global(.v-theme--light .availability-slot--selected) {
  background: var(--color-button-secondary-hover);
  border-color: color-mix(in srgb, var(--color-primary) 42%, transparent);
  color: var(--color-primary-dark);
}

:global(.v-theme--dark .availability-range),
:global(.v-theme--dark .availability-slot) {
  color: rgb(var(--v-theme-text-primary));
  border-color: rgba(var(--v-theme-border-subtle), 0.28);
}

:global(.v-theme--dark .availability-range:hover),
:global(.v-theme--dark .availability-range:focus-visible),
:global(.v-theme--dark .availability-range--selected),
:global(.v-theme--dark .availability-slot:hover),
:global(.v-theme--dark .availability-slot:focus-visible),
:global(.v-theme--dark .availability-slot--selected) {
  color: rgb(var(--v-theme-text-primary));
  border-color: rgba(var(--v-theme-border-default), 0.48);
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

  .appointment-topbar {
    min-height: 60px;
    padding-inline: 8px;
  }

  .appointment-topbar__title {
    font-size: 0.98rem;
  }

  .appointment-body {
    padding-inline: 14px !important;
  }

  .appointment-therapist-card {
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
  }

  .appointment-actions {
    border-top: 1px solid rgba(var(--v-theme-border-subtle), 0.12);
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 14px;
  }

  .appointment-actions :deep(.v-btn) {
    flex: 1 1 100%;
  }

  .availability-filter {
    justify-content: flex-start;
    margin-inline: -2px;
  }

  .availability-range {
    min-width: 126px;
  }

  .availability-slots {
    margin-inline: -14px;
    overflow-x: auto;
    padding: 0 14px 4px;
  }

  .availability-slot {
    flex: 0 0 auto;
  }
}
</style>
