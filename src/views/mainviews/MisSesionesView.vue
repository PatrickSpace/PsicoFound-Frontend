<template>
  <LayoutDefault layout>
    <v-container>
      <h1 class="text-h4">Mis sesiones</h1>
      <v-divider class="my-5 mx-auto"></v-divider>

      <v-card
        v-if="!hasScheduledAppointments && activeTherapy"
        class="pa-2 my-5 card-backgoundcustom"
        elevation="2"
        variant="text"
        @click="dialog = true"
      >
        <v-card-title class="text-h5">
          Agenda una sesión <v-icon size="small">mdi-open-in-new</v-icon>
        </v-card-title>
        <v-card-text>
          <v-divider></v-divider>
          <v-list-item class="pt-5 px-0">
            <v-list-item-title>
              {{
                nextAppointment
                  ? `Ya tienes una terapia con ${nextAppointment.terapeutaNombre}`
                  : "No tienes una sesión agendada"
              }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{
                nextAppointment
                  ? "Haz click aquí para revisar la agenda de tu terapeuta y agendar una sesión"
                  : "Haz click aquí para revisar la agenda de tu terapeuta y agendar una sesión"
              }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-card-text>
      </v-card>

      <v-row v-if="hasScheduledAppointments" align="stretch">
        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-2 card-backgoundcustom flex-grow-1 d-flex flex-column"
            elevation="2"
            variant="text"
          >
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-calendar-clock</v-icon> Proxima sesión
            </v-card-title>
            <v-card-text>
              <v-divider></v-divider>
              <v-list-item class="w-150 mx-auto pt-5">
                <template #prepend>
                  <h4 class="text-h3">{{ nextAppointmentDay }}</h4>
                </template>
                <v-list-item-title class="pl-5">{{
                  nextAppointmentMonth
                }}</v-list-item-title>
                <v-list-item-subtitle class="pl-5">
                  {{ nextAppointmentYear }}
                  {{ nextAppointment?.hora ? `• ${nextAppointment.hora}` : "" }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-2 card-backgoundcustom flex-grow-1 d-flex flex-column"
            elevation="2"
            variant="text"
          >
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-map-marker-radius</v-icon> Ubicación de
              la sesión
            </v-card-title>
            <v-card-text>
              <v-divider></v-divider>
              <v-list-item class="pt-5 px-0">
                <v-list-item-title>{{
                  nextAppointmentLocation
                }}</v-list-item-title>
                <v-list-item-subtitle>{{
                  nextAppointmentMode
                }}</v-list-item-subtitle>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card
        class="pa-2 my-5 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <v-card-title class="text-h5">
          ¿Cambio de planes? <v-icon size="small">mdi-book-edit</v-icon>
        </v-card-title>
        <v-card-text>
          <v-divider></v-divider>
          <v-list-item class="pt-5 px-0">
            <v-list-item-title>Reprograma tu sesión</v-list-item-title>
            <v-list-item-subtitle>
              Puedes cambiar el horario de una sesión programada
            </v-list-item-subtitle>
          </v-list-item>
        </v-card-text>
      </v-card>

      <v-row align="stretch">
        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-2 card-backgoundcustom flex-grow-1 d-flex flex-column"
            elevation="2"
            variant="text"
            to="/historial"
          >
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-file-document-multiple</v-icon>
              Historial de sesiones
            </v-card-title>
            <v-card-text>
              <v-divider></v-divider>
              <v-list-item class="px-0 pt-5">
                <v-list-item-title
                  >Revisa tu historial de terapias</v-list-item-title
                >
                <v-list-item-subtitle>
                  Podras encontrar las notas de las sesiones y herramientas
                  aprendidas
                </v-list-item-subtitle>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            to="/terapiadetail"
            class="pa-2 card-backgoundcustom flex-grow-1 d-flex flex-column"
            elevation="2"
            variant="text"
          >
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-archive-edit</v-icon> Administra tu
              terapia
            </v-card-title>
            <v-card-text>
              <v-divider></v-divider>
              <v-list-item class="pt-5 px-0">
                <v-list-item-title
                  >Podras cambiar los parametros de tu
                  terapia</v-list-item-title
                >
                <v-list-item-subtitle>
                  Modifica objetivos, cambia de terapeuta, pausa tu terapia
                </v-list-item-subtitle>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <CitaDialog
        v-model="dialog"
        :terapia-id="activeTherapy?.id || ''"
        :terapeuta-id="activeTherapy?.terapeutaId || ''"
        :terapeuta-nombre="activeTherapy?.terapeutaNombre || ''"
        :redirect-on-save="false"
        @saved="loadTherapies"
      />
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import { useAuthStore } from "@/store/auth";
import { getTherapiesByPatient } from "@/services/terapiaService";

const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapies = ref([]);
const dialog = ref(false);

function parseAppointmentDate(appointment) {
  if (!appointment?.fecha) return null;

  const rawDate = appointment.hora
    ? `${appointment.fecha}T${appointment.hora}`
    : `${appointment.fecha}T00:00`;

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const nextAppointment = computed(() => {
  const appointments = therapies.value
    .flatMap((therapy) =>
      (Array.isArray(therapy.citas) ? therapy.citas : []).map(
        (appointment) => ({
          ...appointment,
          terapeutaNombre: therapy.terapeutaNombre,
        })
      )
    )
    .filter((appointment) => {
      const status = (appointment?.estado || "").toString().trim().toLowerCase();
      return (status === "pendiente" || status === "confirmada") && parseAppointmentDate(appointment);
    })
    .sort((a, b) => parseAppointmentDate(a) - parseAppointmentDate(b));

  return appointments[0] || null;
});

const hasScheduledAppointments = computed(() =>
  therapies.value.some((therapy) =>
    (Array.isArray(therapy.citas) ? therapy.citas : []).some((appointment) => {
      const status = (appointment?.estado || "")
        .toString()
        .trim()
        .toLowerCase();
      return status === "pendiente" || status === "confirmada";
    })
  )
);

const activeTherapy = computed(
  () =>
    therapies.value.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null
);

const nextAppointmentDay = computed(() => {
  const date = parseAppointmentDate(nextAppointment.value);
  return date ? String(date.getDate()).padStart(2, "0") : "--";
});

const nextAppointmentMonth = computed(() => {
  const date = parseAppointmentDate(nextAppointment.value);
  return date
    ? date.toLocaleDateString("es-PE", { month: "long" })
    : "Sin fecha";
});

const nextAppointmentYear = computed(() => {
  const date = parseAppointmentDate(nextAppointment.value);
  return date ? date.getFullYear() : "";
});

const nextAppointmentLocation = computed(() => {
  if (!nextAppointment.value) return "Sin ubicación definida";
  return nextAppointment.value.ubicacion || "Sin ubicación definida";
});

const nextAppointmentMode = computed(() => {
  if (!nextAppointment.value) return "Aún no tienes una modalidad definida";
  return nextAppointment.value.modalidad || "Aún no tienes una modalidad definida";
});

async function loadTherapies() {
  try {
    const pacienteUid = currentUser.value?.uid || "demo-user";
    therapies.value = await getTherapiesByPatient(pacienteUid);
  } catch (error) {
    console.error("Error loading therapies for sessions:", error);
    therapies.value = [];
  }
}

onMounted(() => {
  loadTherapies();
});
</script>
