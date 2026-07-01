<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="ma-4 card-backgoundcustom" elevation="2" variant="text">
      <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold">
        <v-icon color="secondary" size="small">mdi-message-alert-outline</v-icon>
        Dejar feedback
      </v-card-title>
      <v-divider class="mx-4"></v-divider>

      <v-card-text class="pt-6">
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ errorMessage }}
        </v-alert>

        <v-select
          v-model="form.categoria"
          label="Tipo"
          variant="outlined"
          :items="categoryOptions"
          item-title="label"
          item-value="value"
          class="mb-4"
          density="comfortable"
        ></v-select>

        <v-textarea
          v-model="form.observacion"
          label="Observación"
          variant="outlined"
          rows="5"
          counter="500"
          density="comfortable"
        ></v-textarea>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 feedback-actions">
        <v-spacer></v-spacer>
        <v-btn variant="text" :disabled="saving" @click="closeDialog">Cancelar</v-btn>
        <v-btn color="secondary" variant="tonal" :loading="saving" @click="submitFeedback">
          Enviar feedback
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { createFeedback } from "@/services/feedbackService";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const authStore = useAuthStore();
const { currentUser, userName } = storeToRefs(authStore);

const saving = ref(false);
const errorMessage = ref("");
const categoryOptions = [
  { label: "Error", value: "error" },
  { label: "Sugerencia", value: "sugerencia" },
  { label: "Comentario", value: "comentario" },
];

const form = reactive({
  categoria: "comentario",
  observacion: "",
});

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      errorMessage.value = "";
      return;
    }

    resetForm();
  }
);

function resetForm() {
  form.categoria = "comentario";
  form.observacion = "";
  errorMessage.value = "";
}

function closeDialog() {
  emit("update:modelValue", false);
}

async function submitFeedback() {
  errorMessage.value = "";

  if (!form.observacion.trim()) {
    errorMessage.value = "Escribe una observación para enviar el feedback.";
    return;
  }

  if (!currentUser.value?.uid) {
    errorMessage.value = "Necesitas iniciar sesión para enviar feedback.";
    return;
  }

  saving.value = true;

  try {
    await createFeedback({
      nombreUsuario: userName.value,
      userId: currentUser.value.uid,
      correoUsuario: currentUser.value.email || "",
      mensajeObservacion: form.observacion.trim(),
      categoria: form.categoria,
    });

    emit("saved");
    closeDialog();
  } catch (error) {
    errorMessage.value = "No pudimos guardar tu feedback. Intentalo nuevamente.";
    console.error(error);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
@media (max-width: 600px) {
  .feedback-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .feedback-actions :deep(.v-btn) {
    flex: 1 1 100%;
  }
}
</style>
