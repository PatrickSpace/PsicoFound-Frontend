<template>
  <v-data-table :headers="headers" :items="therapies" class="card-backgoundcustom" :items-per-page="10">
    <template #no-data>No hay terapias registradas en esta selección.</template>
    <template #item.fechaCreacion="{ value }">{{ formatTherapyDate(value) }}</template>
    <template #item.estado="{ value }"><v-chip size="small" variant="tonal" :color="value === 'activo' ? 'success' : 'secondary'">{{ value }}</v-chip></template>
    <template #item.actions="{ item }">
      <v-btn class="pf-btn-icon" icon="mdi-open-in-new" :aria-label="'Ver terapia ' + item.id"
        :to="{ path: '/terapiadetail', query: { id: item.id, patientUid: item.pacienteUid, contextMode: appContext.activeMode } }" />
    </template>
  </v-data-table>
</template>
<script setup>
import { useAppContextStore } from "@/store/appContext";
import { formatTherapyDate } from "@/utils/therapyContext";
defineProps({ therapies: { type: Array, default: () => [] } });
const appContext = useAppContextStore();
const headers = [
  { title: "Terapia", key: "id" }, { title: "Paciente", key: "pacienteNombre" },
  { title: "Profesional", key: "terapeutaNombre" }, { title: "Estado", key: "estado" },
  { title: "Fecha de creación", key: "fechaCreacion" }, { title: "Consultar", key: "actions", sortable: false },
];
</script>
