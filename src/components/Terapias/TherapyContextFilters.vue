<template>
  <v-row class="mb-3" data-testid="therapy-filters">
    <v-col v-if="professional" cols="12" md="4">
      <v-select :model-value="patient" :items="patients" label="Filtrar por paciente" clearable
        variant="outlined" density="comfortable" @update:model-value="selectPatient" />
    </v-col>
    <v-col cols="12" :md="professional ? 5 : 8">
      <TherapySelect :model-value="therapy" :items="therapyOptions" label="Filtrar por terapia" clearable
        variant="outlined" density="comfortable" @update:model-value="$emit('update:therapy', $event || '')" />
    </v-col>
    <v-col v-if="statuses.length" cols="12" :md="professional ? 3 : 4">
      <v-select :model-value="status" :items="statuses" label="Filtrar por estado" clearable
        variant="outlined" density="comfortable" @update:model-value="$emit('update:status', $event || '')" />
    </v-col>
  </v-row>
</template>
<script setup>
import { computed } from "vue";
import { therapyLabel } from "@/utils/therapyContext";
import TherapySelect from "@/components/Terapias/TherapySelect.vue";
const props = defineProps({
  therapies: { type: Array, default: () => [] }, professional: Boolean,
  patient: String, therapy: String, status: String,
  statuses: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:patient", "update:therapy", "update:status"]);
const patients = computed(() => [...new Map(props.therapies.map((t) =>
  [t.pacienteUid, { title: t.pacienteNombre || "Paciente", value: t.pacienteUid }])).values()]);
const therapyOptions = computed(() => props.therapies.filter((t) => !props.patient || t.pacienteUid === props.patient)
  .map((t) => ({ title: therapyLabel(t), value: t.id })));
function selectPatient(value) { emit("update:patient", value || ""); emit("update:therapy", ""); }
</script>
