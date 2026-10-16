<template>
  <v-text-field v-model="search" label="Buscar citas" clearable prepend-inner-icon="mdi-magnify" variant="outlined" />
  <TherapyAppointmentsTable :appointments="filtered" />
</template>
<script setup>
import { computed, ref, watch } from "vue";
import TherapyAppointmentsTable from "@/components/Terapias/TherapyAppointmentsTable.vue";
const props = defineProps({ appointments: { type: Array, default: () => [] } });
const search = ref("");
const filtered = computed(() => props.appointments.filter((item) =>
  [item.fecha, item.hora, item.pacienteNombre, item.terapiaId, item.estado].join(" ").toLowerCase()
    .includes((search.value || "").trim().toLowerCase())));
watch(() => props.appointments, () => { search.value = ""; });
</script>
