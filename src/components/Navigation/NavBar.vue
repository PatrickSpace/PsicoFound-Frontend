<template>
  <v-app-bar app class="bg-transparent responsive-app-bar" flat>
    <v-app-bar-title class="text-h5">PsicoFound</v-app-bar-title>
    <v-spacer />
    <v-btn-toggle
      v-if="appContext.canSwitchModes"
      :model-value="appContext.activeMode"
      class="mode-switch d-none d-sm-inline-flex"
      density="comfortable"
      mandatory
      rounded="lg"
      variant="tonal"
      @update:model-value="switchMode"
    >
      <v-btn
        v-for="mode in appContext.availableModes"
        :key="mode.value"
        :value="mode.value"
        size="small"
      >
        <v-icon start>{{ mode.icon }}</v-icon>
        {{ mode.label }}
      </v-btn>
    </v-btn-toggle>
    <v-menu v-if="appContext.canSwitchModes" location="bottom end">
      <template #activator="{ props }">
        <v-btn icon v-bind="props" class="d-sm-none">
          <v-icon>mdi-swap-horizontal</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item
          v-for="mode in appContext.availableModes"
          :key="mode.value"
          :prepend-icon="mode.icon"
          :title="mode.label"
          @click="switchMode(mode.value)"
        />
      </v-list>
    </v-menu>
    <v-btn icon>
      <v-icon>mdi-magnify</v-icon>
    </v-btn>
    <v-btn icon>
      <v-icon>mdi-bell</v-icon>
    </v-btn>
    <v-btn icon @click="isFeedbackDialogOpen = true">
      <v-icon>mdi-message-alert-outline</v-icon>
    </v-btn>

    <v-menu open-on-hover>
      <template v-slot:activator="{ props }">
        <v-btn icon v-bind="props">
          <v-icon>mdi-account</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item link @click="logout()"> LogOut</v-list-item>
      </v-list>
    </v-menu>

    <FeedbackDialog
      v-model="isFeedbackDialogOpen"
      @saved="showFeedbackSaved = true"
    />

    <v-snackbar v-model="showFeedbackSaved" color="success" timeout="2500">
      Feedback enviado correctamente.
    </v-snackbar>
  </v-app-bar>
</template>
<script setup>
import { ref } from "vue";
import { auth } from "@/plugins/Firebase/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import FeedbackDialog from "@/components/Navigation/FeedbackDialog.vue";
import { useAppContextStore } from "@/store/appContext";

const router = useRouter();
const appContext = useAppContextStore();
const isFeedbackDialogOpen = ref(false);
const showFeedbackSaved = ref(false);

function switchMode(mode) {
  if (!mode || mode === appContext.activeMode) {
    return;
  }

  appContext.setActiveMode(mode);
  router.push(defaultRouteForMode(mode));
}

async function logout() {
  try {
    await signOut(auth);
    console.log("logout");
  } catch (e) {
    console.error(e);
  } finally {
    router.push("/login");
  }
}

function defaultRouteForMode(mode) {
  if (mode === "psychologist") {
    return "/psicologo/sesiones";
  }

  if (mode === "admin") {
    return "/pacientes";
  }

  return "/dashboard";
}
</script>

<style scoped>
.mode-switch {
  max-width: min(44vw, 420px);
  overflow: hidden;
}
</style>
