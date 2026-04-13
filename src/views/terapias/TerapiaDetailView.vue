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
                :disabled="therapy.estado !== 'activo'"
                @click="dialog = true"
              >
                Agendar cita
              </v-btn>
              <div class="text-caption text-medium-emphasis mt-3">
                Solo puedes agendar nuevas citas cuando la terapia está en estado activo.
              </div>
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
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import { getTherapyById } from "@/services/terapiaService";

const route = useRoute();
const therapy = ref(null);
const dialog = ref(false);
const appointmentHeaders = [
  { title: "Fecha", value: "fecha" },
  { title: "Hora", value: "hora" },
  { title: "Estado", value: "estado" },
  { title: "Notas", value: "notas" },
];

const formattedCreationDate = computed(() => {
  if (!therapy.value?.fechaCreacion) return "No definida";
  const parsed = new Date(therapy.value.fechaCreacion);
  if (Number.isNaN(parsed.getTime())) return "No definida";
  return parsed.toLocaleDateString("es-PE");
});

const appointmentItems = computed(() =>
  (Array.isArray(therapy.value?.citas) ? therapy.value.citas : []).map((appointment) => ({
    citaId: appointment.citaId || `${appointment.fecha}-${appointment.hora}`,
    fecha: appointment.fecha || "Sin fecha",
    hora: appointment.hora || "Sin hora",
    estado: appointment.estado || "pendiente",
    notas: appointment.notas || "Sin notas",
  }))
);

function statusColor(status) {
  const normalized = (status || "").toString().trim().toLowerCase();
  if (normalized === "realizada" || normalized === "completada") return "primary";
  if (normalized === "activo") return "green";
  if (normalized === "pausa") return "orange";
  if (normalized === "finalizado") return "red";
  return "blue";
}

async function loadTherapy() {
  const therapyId = route.query.id?.toString() || "";
  if (!therapyId) return;

  try {
    therapy.value = await getTherapyById(therapyId);
  } catch (error) {
    console.error("Error loading therapy detail:", error);
    therapy.value = null;
  }
}

onMounted(() => {
  loadTherapy();
});
</script>
