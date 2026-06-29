<template>
  <header class="app-top-nav">
    <div class="app-top-nav__content">
      <div class="nav-title">PsicoFound</div>
      <v-spacer />
      <div class="nav-actions">
        <v-chip
          v-if="activeMode"
          class="mode-chip d-none d-md-inline-flex"
          color="secondary"
          variant="tonal"
          :prepend-icon="activeMode.icon"
        >
          {{ activeMode.label }}
        </v-chip>
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
            <v-btn icon v-bind="props" class="d-sm-none nav-icon-btn" aria-label="Cambiar vista">
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
        <v-btn icon class="nav-icon-btn" aria-label="Enviar feedback" @click="isFeedbackDialogOpen = true">
          <v-icon>mdi-message-alert-outline</v-icon>
        </v-btn>

        <v-menu location="bottom end">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" class="nav-icon-btn" aria-label="Cuenta">
              <v-icon>mdi-account</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              :title="userName"
              :subtitle="currentUser?.email || activeMode?.label || ''"
              prepend-icon="mdi-account-circle-outline"
            />
            <v-divider />
            <v-list-item
              v-if="activeMode"
              :title="`Vista ${activeMode.label}`"
              :prepend-icon="activeMode.icon"
            />
            <template v-if="appContext.canSwitchModes">
              <v-list-subheader>Cambiar vista</v-list-subheader>
              <v-list-item
                v-for="mode in appContext.availableModes"
                :key="mode.value"
                :active="mode.value === appContext.activeMode"
                :prepend-icon="mode.icon"
                :title="mode.label"
                @click="switchMode(mode.value)"
              />
            </template>
            <v-divider />
            <v-list-item
              title="Cerrar sesión"
              prepend-icon="mdi-logout"
              @click="logout()"
            />
          </v-list>
        </v-menu>
      </div>
    </div>

    <FeedbackDialog
      v-model="isFeedbackDialogOpen"
      @saved="showFeedbackSaved = true"
    />

    <v-snackbar v-model="showFeedbackSaved" color="success" timeout="2500">
      Feedback enviado correctamente.
    </v-snackbar>
  </header>
</template>
<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { auth } from "@/plugins/Firebase/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import FeedbackDialog from "@/components/Navigation/FeedbackDialog.vue";
import { useAppContextStore } from "@/store/appContext";
import { useAuthStore } from "@/store/auth";

const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser, userName } = storeToRefs(authStore);
const isFeedbackDialogOpen = ref(false);
const showFeedbackSaved = ref(false);

const activeMode = computed(
  () =>
    appContext.availableModes.find(
      (mode) => mode.value === appContext.activeMode
    ) || null
);

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
.app-top-nav {
  left: 0;
  min-height: calc(56px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  position: fixed;
  right: 0;
  top: 0;
  width: 100vw;
  z-index: 1100;
}

.app-top-nav__content {
  align-items: center;
  display: flex;
  gap: 12px;
  height: 56px;
  padding-inline: 16px;
  width: 100%;
}

.mode-switch {
  max-width: min(44vw, 420px);
  overflow: hidden;
}

.mode-chip {
  margin-inline-end: 4px;
}

.nav-actions {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  justify-content: flex-end;
}

.nav-title {
  flex: 1 1 auto;
  font-size: 1.35rem;
  font-weight: 500;
  line-height: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-icon-btn {
  flex: 0 0 44px;
  height: 44px;
  width: 44px;
}

@media (max-width: 600px) {
  .app-top-nav__content {
    gap: 8px;
    padding-inline: 12px;
  }

  .nav-title {
    font-size: 1.18rem !important;
  }

  :deep(.v-btn--icon) {
    height: 40px;
    width: 40px;
  }

  .nav-actions {
    gap: 4px;
  }

  .nav-icon-btn {
    flex-basis: 40px;
  }
}
</style>
