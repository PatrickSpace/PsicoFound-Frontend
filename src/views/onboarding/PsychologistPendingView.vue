<template>
  <OnboardingShell
    eyebrow="Revisión profesional"
    title="Tu solicitud está en revisión"
    subtitle="Un administrador validará tus datos antes de habilitar la vista profesional."
  >
    <div class="pending-state">
      <v-avatar color="warning" variant="tonal" size="72">
        <v-icon size="38">mdi-clock-check-outline</v-icon>
      </v-avatar>
      <div>
        <h2 class="text-h5 font-weight-bold">Cuenta creada correctamente</h2>
        <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
          Te avisaremos cuando la revisión termine. Mientras tanto puedes usar
          Lurems como paciente con la misma cuenta.
        </p>
      </div>
    </div>

    <v-alert
      v-if="errorMessage"
      class="mt-5"
      color="error"
      icon="mdi-alert-circle-outline"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <div class="pending-actions mt-7">
      <v-btn
        class="pf-btn-secondary"
        prepend-icon="mdi-refresh"
        :loading="checking"
        @click="checkStatus"
      >
        Revisar estado
      </v-btn>
      <v-btn
        class="pf-btn-primary"
        append-icon="mdi-arrow-right"
        @click="openPatientView"
      >
        Ir a mi vista de paciente
      </v-btn>
    </div>
  </OnboardingShell>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import OnboardingShell from "@/components/onboarding/OnboardingShell.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import { getLatestPsychologistRequestByUser } from "@/services/psychologistRequestService";

const router = useRouter();
const appContext = useAppContextStore();
const checking = ref(false);
const errorMessage = ref("");

async function checkStatus() {
  checking.value = true;
  errorMessage.value = "";

  try {
    const request = await getLatestPsychologistRequestByUser(
      auth.currentUser?.uid
    );

    if (request?.status === "approved") {
      await appContext.loadForUser(auth.currentUser.uid, { force: true });
      appContext.setActiveMode("psychologist");
      await router.replace("/psicologo/sesiones");
      return;
    }

    if (request?.status === "rejected") {
      await router.replace("/onboarding/psicologo");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Solicitud en revisión",
          message: "Aún no hay cambios en el estado de tu solicitud.",
        },
      })
    );
  } catch (error) {
    console.error("Professional status error:", error);
    errorMessage.value = "No pudimos consultar el estado. Intenta nuevamente.";
  } finally {
    checking.value = false;
  }
}

async function openPatientView() {
  await appContext.loadForUser(auth.currentUser.uid, { force: true });
  appContext.setActiveMode("patient");
  await router.push("/dashboard");
}
</script>

<style scoped>
.pending-state {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 22px;
  padding-block: 18px;
}

.pending-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 600px) {
  .pending-state {
    grid-template-columns: 1fr;
  }

  .pending-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .pending-actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>
