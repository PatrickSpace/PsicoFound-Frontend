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
            <v-btn
              icon
              v-bind="props"
              class="d-sm-none nav-icon-btn"
              aria-label="Cambiar vista"
              variant="text"
            >
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
        <v-menu location="bottom end" width="360">
          <template #activator="{ props }">
            <v-badge
              :content="unreadNotificationsCount"
              :model-value="unreadNotificationsCount > 0"
              color="secondary"
              offset-x="4"
              offset-y="4"
            >
              <v-btn
                icon
                v-bind="props"
                class="nav-icon-btn"
                aria-label="Notificaciones"
                variant="text"
              >
                <v-icon>mdi-bell-outline</v-icon>
              </v-btn>
            </v-badge>
          </template>
          <v-card class="notifications-menu card-backgoundcustom" elevation="2" variant="text">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
              <v-icon color="secondary" size="small">mdi-bell-outline</v-icon>
              Notificaciones
            </v-card-title>
            <v-divider />
            <v-list v-if="notifications.length" class="bg-transparent" density="comfortable">
              <v-list-item
                v-for="notification in notifications"
                :key="notification.id"
                :class="{ 'notification-unread': !notification.readAt }"
                :title="notification.title"
                :subtitle="notification.message"
                @click="openNotification(notification)"
              >
                <template #prepend>
                  <v-icon :color="!notification.readAt ? 'secondary' : undefined">
                    {{ notificationIcon(notification.type) }}
                  </v-icon>
                </template>
                <template #append>
                  <v-progress-circular
                    v-if="openingNotificationId === notification.id"
                    indeterminate
                    color="secondary"
                    size="18"
                    width="2"
                  />
                </template>
              </v-list-item>
            </v-list>
            <v-empty-state
              v-else
              class="py-6"
              headline="Sin notificaciones"
              text="Los avisos de citas aparecerán aquí."
              icon="mdi-bell-check-outline"
            />
          </v-card>
        </v-menu>
        <v-btn
          icon
          class="nav-icon-btn"
          aria-label="Enviar feedback"
          variant="text"
          @click="isFeedbackDialogOpen = true"
        >
          <v-icon>mdi-message-alert-outline</v-icon>
        </v-btn>

        <v-btn
          icon
          class="nav-icon-btn"
          aria-label="Configuración"
          variant="text"
          to="/configuracion"
        >
          <v-icon>mdi-cog-outline</v-icon>
        </v-btn>
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
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import FeedbackDialog from "@/components/Navigation/FeedbackDialog.vue";
import { useAppContextStore } from "@/store/appContext";
import { useAuthStore } from "@/store/auth";
import {
  markNotificationAsRead,
  watchNotifications,
} from "@/services/notificationService";

const router = useRouter();
const appContext = useAppContextStore();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const isFeedbackDialogOpen = ref(false);
const showFeedbackSaved = ref(false);
const notifications = ref([]);
const openingNotificationId = ref("");
let unsubscribeNotifications = null;

const activeMode = computed(
  () =>
    appContext.availableModes.find(
      (mode) => mode.value === appContext.activeMode
    ) || null
);

const unreadNotificationsCount = computed(
  () => notifications.value.filter((notification) => !notification.readAt).length
);

watch(
  () => currentUser.value?.uid,
  (uid) => {
    unsubscribeNotifications?.();
    notifications.value = [];

    if (!uid) {
      unsubscribeNotifications = null;
      return;
    }

    unsubscribeNotifications = watchNotifications(
      uid,
      (items) => {
        notifications.value = items;
      },
      (error) => {
        console.error("Error loading notifications:", error);
        notifications.value = [];
      }
    );
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  unsubscribeNotifications?.();
});

function switchMode(mode) {
  if (!mode || mode === appContext.activeMode) {
    return;
  }

  appContext.setActiveMode(mode);
  router.push(defaultRouteForMode(mode));
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

async function openNotification(notification) {
  if (!notification?.id || openingNotificationId.value) {
    return;
  }

  openingNotificationId.value = notification.id;

  try {
    if (!notification.readAt) {
      await markNotificationAsRead(notification.id);
    }
    if (notification.route) {
      await router.push(notification.route);
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: "No se pudo abrir la notificación.",
        },
      })
    );
  } finally {
    openingNotificationId.value = "";
  }
}

function notificationIcon(type = "") {
  if (type.includes("meeting_link")) return "mdi-video-outline";
  if (type.includes("confirmed")) return "mdi-calendar-check-outline";
  if (type.includes("completed")) return "mdi-check-circle-outline";
  if (type.includes("rescheduled")) return "mdi-calendar-sync-outline";
  return "mdi-calendar-clock-outline";
}
</script>

<style scoped>
.app-top-nav {
  backdrop-filter: blur(16px);
  background:
    linear-gradient(
      180deg,
      rgba(3, 7, 7, 0.72) 0%,
      rgba(3, 7, 7, 0.42) 72%,
      rgba(3, 7, 7, 0) 100%
    );
  left: 0;
  min-height: 64px;
  padding-top: 0;
  position: fixed;
  right: 0;
  top: 0;
  width: 100vw;
  z-index: 1100;
}

:global(.v-theme--light) .app-top-nav {
  background: rgba(248, 251, 249, 0.88);
  border-bottom: 1px solid rgba(18, 58, 53, 0.14);
  box-shadow: 0 10px 30px rgba(18, 58, 53, 0.1);
}

.app-top-nav::after {
  background: rgba(255, 255, 255, 0.08);
  bottom: 0;
  content: "";
  height: 1px;
  left: 12px;
  position: absolute;
  right: 12px;
}

:global(.v-theme--light) .app-top-nav::after {
  background: transparent;
}

.app-top-nav__content {
  align-items: center;
  display: flex;
  gap: 12px;
  height: 64px;
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

.notifications-menu {
  max-height: min(70vh, 520px);
  overflow-y: auto;
}

.notification-unread {
  background: rgba(var(--v-theme-secondary), 0.08);
}

:global(.v-theme--light) .nav-title {
  color: rgb(var(--v-theme-on-background));
  font-weight: 600;
}

.nav-icon-btn {
  background: transparent !important;
  color: rgb(var(--v-theme-on-background));
  flex: 0 0 44px;
  height: 44px;
  width: 44px;
}

.nav-icon-btn :deep(.v-btn__overlay),
.nav-icon-btn :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

@media (max-width: 600px) {
  .app-top-nav {
    min-height: 64px;
  }

  .app-top-nav__content {
    gap: 8px;
    height: 64px;
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
