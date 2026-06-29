<template>
  <section class="survey-shell">
    <div class="survey-header">
      <div>
        <p class="text-caption text-medium-emphasis mb-1">
          Encuesta conversacional
        </p>
        <h1 class="survey-title font-weight-bold">
          Cuéntanos qué estás buscando
        </h1>
      </div>

      <v-chip
        :color="canViewRecommendations ? 'success' : 'secondary'"
        variant="tonal"
        prepend-icon="mdi-clipboard-check-outline"
      >
        {{ canViewRecommendations ? "Perfil listo" : "Perfil en progreso" }}
      </v-chip>
    </div>

    <div ref="messagesContainer" class="messages-panel">
      <div
        v-for="message in visibleMessages"
        :key="message.id"
        class="message-row"
        :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
      >
        <div class="message-bubble">
          <div class="message-author">
            {{ message.role === "user" ? "Tú" : "PsicoFound" }}
          </div>
          <p class="message-text">{{ message.text }}</p>
        </div>
      </div>

      <div v-if="loading" class="message-row is-assistant">
        <div class="message-bubble">
          <div class="message-author">PsicoFound</div>
          <div class="typing-dots" aria-label="Pensando">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <form class="composer" @submit.prevent="handleSubmit">
      <v-textarea
        v-model="draft"
        auto-grow
        rows="1"
        max-rows="4"
        variant="solo-filled"
        rounded="lg"
        hide-details
        :disabled="loading"
        placeholder="Escribe cómo te has sentido o qué tipo de apoyo buscas"
        @keydown.enter.exact.prevent="handleSubmit"
      />

      <v-btn
        class="send-button"
        color="secondary"
        type="submit"
        icon="mdi-send"
        :loading="loading"
        :disabled="!canSend"
        aria-label="Enviar mensaje"
      />
    </form>

    <div class="survey-actions">
      <v-btn
        variant="tonal"
        prepend-icon="mdi-refresh"
        :loading="resetting"
        :disabled="loading || resetting"
        @click="handleResetConversation"
      >
        Reiniciar conversación
      </v-btn>

      <v-btn
        color="secondary"
        variant="flat"
        append-icon="mdi-account-search"
        :disabled="!canViewRecommendations"
        @click="goToRecommendations"
      >
        Ver psicólogos recomendados
      </v-btn>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useTerapiaStore } from "@/store/terapiaStore";
import {
  resetProfileChatConversation,
  sendProfileChatMessage,
  watchConversation,
  watchConversationMessages,
  watchProfile,
} from "@/services/conversationService";
import {
  applyProfileToTerapiaStore,
  isProfileReadyForRecommendations,
} from "@/services/matchingService";

const router = useRouter();
const authStore = useAuthStore();
const terapiaStore = useTerapiaStore();

const draft = ref("");
const loading = ref(false);
const resetting = ref(false);
const messages = ref([]);
const profile = ref(null);
const messagesContainer = ref(null);
const activeSessionId = ref("");
const crisisRouteTriggered = ref(false);

let unsubscribeConversation = null;
let unsubscribeMessages = null;
let unsubscribeProfile = null;

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hola, soy el asistente de PsicoFound. Cuéntame qué te trae por aquí o qué tipo de apoyo buscas.",
};

const visibleMessages = computed(() =>
  messages.value.length > 0 ? messages.value : [welcomeMessage]
);

const canSend = computed(() => draft.value.trim().length > 0 && !loading.value);
const canViewRecommendations = computed(
  () =>
    Boolean(profile.value?.completado) ||
    isProfileReadyForRecommendations(profile.value)
);

watch(
  () => authStore.currentUser,
  (user) => {
    unsubscribeConversation?.();
    unsubscribeMessages?.();
    unsubscribeProfile?.();

    if (!user?.uid) {
      messages.value = [];
      profile.value = null;
      activeSessionId.value = "";
      crisisRouteTriggered.value = false;
      return;
    }

    unsubscribeConversation = watchConversation(
      user.uid,
      (conversation) => {
        const sessionId = conversation?.activeSessionId || "";

        if (sessionId === activeSessionId.value) {
          return;
        }

        activeSessionId.value = sessionId;
        messages.value = [];
        unsubscribeMessages?.();
        unsubscribeMessages = sessionId
          ? watchConversationMessages(
              user.uid,
              sessionId,
              (items) => {
                messages.value = items;
                scrollToBottom();
              },
              () => {
                notifyError("No pudimos cargar el historial de conversación.");
              }
            )
          : null;
      },
      () => {
        notifyError("No pudimos cargar la conversación actual.");
      }
    );

    unsubscribeProfile = watchProfile(
      user.uid,
      (item) => {
        profile.value = item;

        if (item?.riesgoSuicida && !crisisRouteTriggered.value) {
          crisisRouteTriggered.value = true;
          applyProfileToTerapiaStore(item, terapiaStore);
          router.push({
            path: "/elegirterapeuta",
            query: { crisis: "1" },
          });
        }
      },
      () => {
        notifyError("No pudimos cargar tu perfil de búsqueda.");
      }
    );
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  unsubscribeConversation?.();
  unsubscribeMessages?.();
  unsubscribeProfile?.();
});

async function handleSubmit() {
  const message = draft.value.trim();

  if (!message || loading.value) {
    return;
  }

  draft.value = "";

  await sendChatMessage(message);
}

async function sendChatMessage(message) {
  loading.value = true;

  try {
    const result = await sendProfileChatMessage(message);
    syncProfileFromChatResult(result);
  } catch (err) {
    notifyError(
      getReadableErrorMessage(err) ||
        "No pudimos enviar el mensaje. Inténtalo nuevamente en unos segundos."
    );
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

async function handleResetConversation() {
  if (loading.value || resetting.value) {
    return;
  }

  resetting.value = true;
  draft.value = "";

  try {
    await resetProfileChatConversation();
    messages.value = [];
  } catch (err) {
    notifyError(
      getReadableErrorMessage(err) ||
        "No pudimos reiniciar la conversación. Inténtalo nuevamente."
    );
  } finally {
    resetting.value = false;
    scrollToBottom();
  }
}

function syncProfileFromChatResult(result) {
  const nextProfile = result?.profile || result?.data;

  if (!nextProfile || typeof nextProfile !== "object") {
    return;
  }

  profile.value = {
    ...(profile.value || {}),
    ...nextProfile,
  };
}

function goToRecommendations() {
  applyProfileToTerapiaStore(profile.value, terapiaStore);
  router.push("/elegirterapeuta");
}

async function scrollToBottom() {
  await nextTick();

  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function getReadableErrorMessage(err) {
  return (err?.message || "").toString().trim();
}

function notifyError(message) {
  window.dispatchEvent(
    new CustomEvent("api-error", {
      detail: {
        message,
        method: "CHAT",
        url: "Encuesta conversacional",
      },
    })
  );
}
</script>

<style scoped>
.survey-shell {
  width: min(920px, 100%);
  margin: 0 auto;
  height: 100%;
  min-height: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.survey-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.survey-title {
  font-size: 2.125rem;
  line-height: 1.18;
  letter-spacing: 0;
}

.messages-panel {
  flex: 1 1 auto;
  min-height: 280px;
  overflow-y: scroll;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(6, 20, 23, 0.58);
  backdrop-filter: blur(12px);
}

:global(.v-theme--light) .messages-panel {
  border-color: rgba(65, 105, 102, 0.16);
  background: rgba(255, 255, 255, 0.72);
}

.messages-panel::-webkit-scrollbar {
  width: 10px;
}

.messages-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
}

:global(.v-theme--light) .messages-panel::-webkit-scrollbar-track {
  background: rgba(65, 105, 102, 0.08);
}

.messages-panel::-webkit-scrollbar-thumb {
  background: rgba(76, 175, 180, 0.58);
  border-radius: 999px;
}

:global(.v-theme--light) .messages-panel::-webkit-scrollbar-thumb {
  background: rgba(95, 128, 123, 0.5);
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row.is-user {
  justify-content: flex-end;
}

.message-row.is-assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: min(680px, 86%);
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
}

:global(.v-theme--light) .message-bubble {
  background: rgba(65, 105, 102, 0.08);
}

.message-row.is-user .message-bubble {
  background: rgba(76, 175, 180, 0.32);
}

:global(.v-theme--light) .message-row.is-user .message-bubble {
  background: rgba(95, 128, 123, 0.2);
}

.message-author {
  margin-bottom: 4px;
  font-size: 0.76rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
}

:global(.v-theme--light) .message-author {
  color: rgba(31, 65, 70, 0.72);
}

.message-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.48;
}

.composer {
  display: grid;
  grid-template-columns: 1fr 48px;
  gap: 12px;
  align-items: end;
  margin-top: 16px;
}

.send-button {
  width: 48px;
  height: 48px;
}

.survey-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.typing-dots {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  height: 22px;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  animation: pulse 1s infinite ease-in-out;
}

:global(.v-theme--light) .typing-dots span {
  background: rgba(31, 65, 70, 0.72);
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes pulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

@media (max-width: 720px) {
  .survey-header {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
  }

  .survey-title {
    font-size: 1.55rem;
    line-height: 1.2;
  }

  .messages-panel {
    min-height: 220px;
    padding: 12px;
  }

  .message-bubble {
    max-width: 94%;
    padding: 10px 12px;
  }

  .message-text {
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .composer {
    grid-template-columns: 1fr 44px;
    gap: 8px;
    margin-top: 12px;
  }

  .send-button {
    width: 44px;
    height: 44px;
  }

  .survey-actions {
    justify-content: stretch;
    gap: 8px;
    margin-top: 12px;
  }

  .survey-actions :deep(.v-btn) {
    flex: 1 1 100%;
  }
}
</style>
