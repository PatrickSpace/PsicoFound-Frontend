<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-btn
        size="x-large"
        prepend-icon="mdi-plus"
        variant="tonal"
        @click="handleNewTherapy"
      >
        Iniciar una nueva terapia
      </v-btn>
    </v-col>

    <v-col cols="12" md="6">
      <v-text-field
        v-model="search"
        clearable
        prepend-inner-icon="mdi-magnify"
        label="Buscar terapias"
        class="w-100"
      />
    </v-col>
  </v-row>

  <v-data-table
    :headers="headers"
    :items="filteredItems"
    class="card-backgoundcustom"
    :items-per-page="10"
    :loading="loading"
  >
    <template #item.problemas="{ item }">
      {{ Array.isArray(item.problemas) ? item.problemas.join(", ") : item.problemas }}
    </template>

    <template #item.actions="{ item }">
      <div class="d-flex ga-2">
        <v-icon icon="mdi-list-box" @click="itemdetail(item.id)"></v-icon>
      </div>
    </template>
  </v-data-table>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { getTherapiesByPatient } from "@/services/terapiaService";

const router = useRouter();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);

const search = ref("");
const items = ref([]);
const loading = ref(false);

const headers = [
  { title: "Terapia", value: "nombre" },
  { title: "Estado", value: "estado" },
  { title: "Fecha inicio", value: "fechaInicio" },
  { title: "Problemas", value: "problemas" },
  { title: "Terapeuta", value: "terapeutaNombre" },
  { title: "Sesiones", value: "sesionesTomadas" },
  { title: "Ver detalle", key: "actions", sortable: false },
];

const filteredItems = computed(() => {
  const q = search.value?.toString().trim().toLowerCase();
  if (!q) return items.value;

  return items.value.filter((t) => {
    const combined = [
      t.nombre,
      t.fechaInicio,
      t.terapeutaNombre,
      Array.isArray(t.problemas) ? t.problemas.join(" ") : t.problemas,
    ]
      .join(" ")
      .toLowerCase();

    return combined.includes(q);
  });
});

const activeTherapy = computed(
  () =>
    items.value.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null
);

function formatDate(value) {
  if (!value) return "No definida";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No definida";

  return date.toLocaleDateString("es-PE");
}

function normalizeTherapy(item) {
  const citas = Array.isArray(item.citas) ? item.citas : [];
  const firstAppointment = citas[0] || {};

  return {
    id: item.id,
    nombre: item.nombre || `Terapia con ${item.terapeutaNombre || "terapeuta"}`,
    estado: item.estado || "activo",
    fechaInicio: formatDate(firstAppointment.fecha),
    problemas: item.problemas || [],
    terapeutaNombre: item.terapeutaNombre || "No definido",
    sesionesTomadas: citas.length,
  };
}

async function loadTherapies() {
  const pacienteUid = currentUser.value?.uid;

  if (!pacienteUid) {
    items.value = [];
    return;
  }

  loading.value = true;

  try {
    const therapies = await getTherapiesByPatient(pacienteUid);
    items.value = therapies.map(normalizeTherapy);
  } catch (error) {
    console.error("Error loading therapies:", error);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function itemdetail(id) {
  router.push({ path: "/terapiadetail", query: { id } });
}

function handleNewTherapy() {
  if (activeTherapy.value?.id) {
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message:
            "Ya tienes una terapia activa. Debes pausarla o cancelarla antes de iniciar una nueva.",
        },
      })
    );
    return;
  }

  router.push("/iniciarencuesta");
}

watch(
  () => currentUser.value?.uid,
  () => {
    loadTherapies();
  },
  { immediate: true }
);
</script>
