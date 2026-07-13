<template>
  <header class="app-top-nav">
    <div class="app-top-nav__content">
      <v-spacer />
      <div class="nav-actions">
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
          class="nav-icon-btn nav-icon-btn--settings"
          aria-label="Configuración"
          variant="text"
          to="/configuracion"
          :active="isSettingsRoute"
          active-class="nav-icon-btn--active"
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
import { useRoute, useRouter } from "vue-router";
import FeedbackDialog from "@/components/Navigation/FeedbackDialog.vue";
import { useAuthStore } from "@/store/auth";
import {
  markNotificationAsRead,
  watchNotifications,
} from "@/services/notificationService";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const isFeedbackDialogOpen = ref(false);
const showFeedbackSaved = ref(false);
const notifications = ref([]);
const openingNotificationId = ref("");
let unsubscribeNotifications = null;

const isSettingsRoute = computed(() => route.name === "configuracion");

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
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.58) 0%,
      rgba(255, 255, 255, 0.34) 64%,
      rgba(255, 255, 255, 0) 100%
    );
  backdrop-filter: blur(var(--pf-floating-blur, 14px)) saturate(1.08);
  border-bottom: 0;
  box-shadow: none;
  -webkit-backdrop-filter: blur(var(--pf-floating-blur, 14px)) saturate(1.08);
  left: 0;
  min-height: 64px;
  padding-top: 0;
  position: fixed;
  right: 0;
  top: 0;
  width: 100vw;
  z-index: 1100;
}

:global(.v-theme--light .app-top-nav) {
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.58) 0%,
      rgba(255, 255, 255, 0.34) 64%,
      rgba(255, 255, 255, 0) 100%
    );
}

:global(.v-theme--dark .app-top-nav) {
  background:
    linear-gradient(
      180deg,
      rgba(18, 36, 34, 0.52) 0%,
      rgba(18, 36, 34, 0.28) 64%,
      rgba(18, 36, 34, 0) 100%
    );
}

.app-top-nav__content {
  align-items: center;
  display: flex;
  gap: 12px;
  height: 64px;
  padding-inline: 16px;
  width: 100%;
}

.nav-actions {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  justify-content: flex-end;
}

.notifications-menu {
  max-height: min(70vh, 520px);
  overflow-y: auto;
}

.notification-unread {
  background: rgba(var(--v-theme-secondary), 0.08);
}

.nav-icon-btn {
  background: transparent !important;
  color: rgb(var(--v-theme-text-primary));
  flex: 0 0 44px;
  height: 44px;
  width: 44px;
}

.nav-icon-btn :deep(.v-btn__overlay),
.nav-icon-btn :deep(.v-btn__underlay) {
  opacity: 0 !important;
}

.nav-icon-btn :deep(.v-icon) {
  color: rgb(var(--v-theme-text-primary)) !important;
  opacity: 1;
}

.nav-icon-btn--settings.v-btn--active,
.nav-icon-btn--settings.nav-icon-btn--active {
  background: var(--color-primary) !important;
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, #ffffff);
  border-radius: 14px !important;
  color: #ffffff !important;
}

.nav-icon-btn--settings.v-btn--active :deep(.v-icon),
.nav-icon-btn--settings.nav-icon-btn--active :deep(.v-icon) {
  color: #ffffff !important;
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

@media (min-width: 1280px) {
  .app-top-nav {
    left: var(--app-drawer-width, 320px);
    width: calc(100vw - var(--app-drawer-width, 320px));
  }
}
</style>
