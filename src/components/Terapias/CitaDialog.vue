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
        {{ citaId ? "Editar cita" : "Agendar cita" }}
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
                {{ citaId ? "Actualiza la fecha y hora de la cita." : "Completa la fecha y hora para registrar la cita." }}
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.fecha"
                label="Fecha"
                type="date"
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
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

            <v-col cols="12" md="6">
              <v-select
                v-model="form.meetingProvider"
                :items="meetingProviderOptions"
                item-title="title"
                item-value="value"
                label="Herramienta de videollamada"
                variant="outlined"
                clearable
                :disabled="!isRemote"
                :hint="isRemote ? 'Opcional. El psicólogo puede completarlo luego.' : 'Disponible para citas remotas.'"
                persistent-hint
                density="comfortable"
              ></v-select>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.meetingUrl"
                label="URL de la sesión"
                placeholder="https://meet.google.com/... o https://zoom.us/..."
                variant="outlined"
                clearable
                :disabled="!isRemote"
                :rules="[r.optionalUrl]"
                :hint="isRemote ? 'Opcional al agendar. El paciente lo verá cuando esté disponible.' : 'Solo aplica a modalidad remota.'"
                persistent-hint
                density="comfortable"
              ></v-text-field>
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
          :disabled="!form.fecha || !form.hora || !form.modalidad || !form.ubicacion || !terapeutaId"
          @click="submitAppointment"
        >
          {{ citaId ? "Guardar cambios" : "Registrar cita" }}
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
import { createAppointment, updateAppointment } from "@/services/citaService";
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
const { currentUser, userName } = storeToRefs(authStore);
const saving = ref(false);
const loadingTherapist = ref(false);
const loadingTherapy = ref(false);
const therapist = ref(null);
const therapy = ref(null);
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

const isRemote = computed(() => normalizeModalidad(form.modalidad) === "remoto");

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

async function submitAppointment() {
  if (!props.terapeutaId || !form.fecha || !form.hora || !form.modalidad || !form.ubicacion) {
    return;
  }

  const meetingUrlValidation = r.optionalUrl(form.meetingUrl);

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
        meetingProvider: isRemote.value ? form.meetingProvider : "",
        meetingUrl: isRemote.value ? form.meetingUrl.trim() : "",
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
        meetingProvider: isRemote.value ? form.meetingProvider : "",
        meetingUrl: isRemote.value ? form.meetingUrl.trim() : "",
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
</script>

<style scoped>
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
}
</style>
