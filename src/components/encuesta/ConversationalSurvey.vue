<template>
  <section class="survey-shell">
    <div class="chat-layout">
      <div class="chat-header">
        <div class="assistant-mark" aria-hidden="true">
          <v-icon size="24">mdi-message-processing-outline</v-icon>
        </div>
        <div class="chat-heading">
          <p class="text-caption text-medium-emphasis mb-1">
            Encuesta conversacional
          </p>
          <h1 class="survey-title font-weight-bold">
            Cuéntame cómo te sientes
          </h1>
          <p class="survey-subtitle text-body-2 text-medium-emphasis">
            Te haré algunas preguntas para entender tu momento y sugerirte psicólogos afines.
          </p>
          <div
            class="profile-status"
            :class="{ 'is-ready': canViewRecommendations }"
          >
            <v-icon size="15">
              {{ canViewRecommendations ? "mdi-check-circle-outline" : "mdi-progress-clock" }}
            </v-icon>
            <span>{{ canViewRecommendations ? "Perfil listo" : "Perfil en progreso" }}</span>
          </div>
        </div>

        <div class="chat-header-actions">
          <v-btn
            class="reset-button"
            variant="text"
            color="secondary"
            size="small"
            prepend-icon="mdi-refresh"
            :loading="resetting"
            :disabled="loading || resetting"
            @click="handleResetConversation"
          >
            Reiniciar
          </v-btn>
          <v-btn
            v-if="canViewRecommendations"
            class="recommendations-button"
            variant="text"
            color="secondary"
            size="small"
            append-icon="mdi-arrow-right"
            @click="goToRecommendations"
          >
            Ver psicólogos
          </v-btn>
        </div>
      </div>

      <div ref="messagesContainer" class="messages-panel">
        <div class="conversation-stream">
          <div
            v-for="message in visibleMessages"
            :key="message.id"
            class="message-row"
            :class="[
              message.role === 'user' ? 'is-user' : 'is-assistant',
              {
                'is-pending': message.pending,
                'has-error': message.error,
              },
            ]"
          >
            <div v-if="message.role !== 'user'" class="message-avatar" aria-hidden="true">
              <v-icon size="18">mdi-heart-outline</v-icon>
            </div>
            <div class="message-stack">
              <div class="message-author">
                {{ message.role === "user" ? "Tú" : "PsicoFound" }}
              </div>
              <div class="message-bubble">
                <p class="message-text">{{ message.text }}</p>
                <div v-if="message.pending || message.error" class="message-status">
                  {{ message.error ? "No enviado" : "Enviando..." }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading" class="message-row is-assistant">
            <div class="message-avatar" aria-hidden="true">
              <v-icon size="18">mdi-heart-outline</v-icon>
            </div>
            <div class="message-stack">
              <div class="message-author">PsicoFound</div>
              <div class="message-bubble typing-bubble">
                <div class="typing-dots" aria-label="Pensando">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="composer-shell">
        <form class="composer" @submit.prevent="handleSubmit">
          <v-textarea
            v-model="draft"
            auto-grow
            rows="1"
            max-rows="5"
            variant="plain"
            hide-details
            :disabled="loading"
            placeholder="Escribe libremente cómo te sientes..."
            @keydown.enter.exact.prevent="handleSubmit"
          />

          <v-btn
            class="send-button"
            color="secondary"
            variant="text"
            type="submit"
            icon="mdi-arrow-up"
            :loading="loading"
            :disabled="!canSend"
            aria-label="Enviar mensaje"
          />
        </form>
        <div class="composer-footer">
          <span>Tu información ayuda a orientar la recomendación, no reemplaza diagnóstico clínico.</span>
        </div>
      </div>

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
const optimisticMessages = ref([]);
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

const visibleMessages = computed(() => {
  const mergedMessages = [
    ...messages.value,
    ...optimisticMessages.value.filter(
      (optimisticMessage) => !hasConfirmedMessage(optimisticMessage)
    ),
  ].sort(compareMessagesByCreatedAt);

  return mergedMessages.length > 0 ? mergedMessages : [welcomeMessage];
});

const canSend = computed(() => draft.value.trim().length > 0 && !loading.value);
const canViewRecommendations = computed(() =>
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
      optimisticMessages.value = [];
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
                reconcileOptimisticMessages();
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
  const optimisticMessage = addOptimisticMessage(message);
  scrollToBottom();

  try {
    const result = await sendProfileChatMessage(message);
    syncProfileFromChatResult(result);
  } catch (err) {
    markOptimisticMessageAsFailed(optimisticMessage.id);
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
    optimisticMessages.value = [];
    profile.value = null;
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

function addOptimisticMessage(text) {
  const optimisticMessage = {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role: "user",
    text,
    pending: true,
    localCreatedAt: Date.now(),
    sessionId: activeSessionId.value || "",
  };

  optimisticMessages.value = [...optimisticMessages.value, optimisticMessage];
  return optimisticMessage;
}

function reconcileOptimisticMessages() {
  optimisticMessages.value = optimisticMessages.value.filter(
    (optimisticMessage) =>
      optimisticMessage.error || !hasConfirmedMessage(optimisticMessage)
  );
}

function markOptimisticMessageAsFailed(id) {
  optimisticMessages.value = optimisticMessages.value.map((message) =>
    message.id === id
      ? {
          ...message,
          pending: false,
          error: true,
        }
      : message
  );
}

function hasConfirmedMessage(optimisticMessage) {
  return messages.value.some((message) => {
    if (message.role !== "user") {
      return false;
    }

    if (
      normalizeMessageText(message.text) !==
      normalizeMessageText(optimisticMessage.text)
    ) {
      return false;
    }

    const confirmedAt = getMessageCreatedAt(message);
    const optimisticAt = getMessageCreatedAt(optimisticMessage);

    if (!confirmedAt || !optimisticAt) {
      return true;
    }

    return Math.abs(confirmedAt - optimisticAt) < 5 * 60 * 1000;
  });
}

function normalizeMessageText(text) {
  return (text || "").toString().trim();
}

function compareMessagesByCreatedAt(a, b) {
  return getMessageCreatedAt(a) - getMessageCreatedAt(b);
}

function getMessageCreatedAt(message) {
  const createdAt = message?.createdAt;

  if (typeof message?.localCreatedAt === "number") {
    return message.localCreatedAt;
  }

  if (typeof createdAt?.toMillis === "function") {
    return createdAt.toMillis();
  }

  if (typeof createdAt?.seconds === "number") {
    return createdAt.seconds * 1000;
  }

  if (typeof createdAt === "number") {
    return createdAt;
  }

  return 0;
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
  width: min(980px, 100%);
  margin: 0 auto;
  height: 100%;
  min-height: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.chat-layout {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(29, 52, 55, 0.74), rgba(14, 29, 31, 0.64));
  box-shadow: 0 22px 70px rgba(0, 18, 20, 0.28);
  backdrop-filter: blur(16px);
}

:global(.v-theme--light) .chat-layout {
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(23, 63, 58, 0.12);
  box-shadow:
    0 1px 2px rgba(23, 63, 58, 0.06),
    0 22px 64px rgba(23, 63, 58, 0.12);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

:global(.v-theme--light) .chat-header {
  border-bottom-color: rgba(23, 63, 58, 0.1);
}

.assistant-mark {
  display: grid;
  place-items: center;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-secondary));
  background:
    linear-gradient(135deg, rgb(var(--v-theme-secondary)), rgb(var(--v-theme-primary)));
  box-shadow: 0 12px 30px rgba(0, 18, 20, 0.22);
}

.chat-heading {
  min-width: 0;
  flex: 1 1 auto;
}

.survey-title {
  font-size: clamp(1.5rem, 2.4vw, 2rem);
  line-height: 1.18;
  letter-spacing: 0;
}

.survey-subtitle {
  max-width: 640px;
  margin: 6px 0 0;
  line-height: 1.45;
}

.profile-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.66);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 20px rgba(0, 18, 20, 0.12);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
  width: fit-content;
}

:global(.v-theme--light) .profile-status {
  color: rgba(23, 38, 34, 0.62);
  background: rgba(55, 111, 101, 0.07);
  border-color: rgba(23, 63, 58, 0.08);
  box-shadow: 0 8px 20px rgba(23, 63, 58, 0.08);
}

.profile-status.is-ready {
  color: rgb(var(--v-theme-success));
}

.chat-header-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
}

.reset-button,
.recommendations-button {
  min-width: 0;
}

.messages-panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: scroll;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
  padding: 24px 18px;
  background: transparent;
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

.conversation-stream {
  width: min(760px, 100%);
  margin: 0 auto;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
}

.message-row.is-user {
  justify-content: flex-end;
}

.message-row.is-assistant {
  justify-content: flex-start;
}

.message-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  margin-top: 20px;
  border-radius: 999px;
  color: rgb(var(--v-theme-on-secondary));
  background: rgb(var(--v-theme-secondary));
}

.message-stack {
  display: flex;
  flex-direction: column;
  max-width: min(680px, calc(100% - 44px));
}

.message-row.is-user .message-stack {
  align-items: flex-end;
  max-width: min(620px, 86%);
}

.message-row.is-pending .message-bubble {
  opacity: 0.82;
}

.message-row.has-error .message-bubble {
  outline: 1px solid rgba(var(--v-theme-error), 0.48);
}

.message-bubble {
  padding: 13px 15px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:global(.v-theme--light) .message-bubble {
  background: rgba(23, 63, 58, 0.06);
  border-color: rgba(23, 63, 58, 0.08);
}

.message-row.is-user .message-bubble {
  color: rgb(var(--v-theme-on-secondary));
  background: rgb(var(--v-theme-secondary));
  border-color: transparent;
}

:global(.v-theme--light) .message-row.is-user .message-bubble {
  color: rgb(var(--v-theme-on-secondary));
  background: rgb(var(--v-theme-secondary));
}

.message-author {
  margin-bottom: 5px;
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
  line-height: 1.55;
}

.message-status {
  margin-top: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.62);
}

:global(.v-theme--light) .message-status {
  color: rgba(23, 38, 34, 0.56);
}

.composer-shell {
  width: min(760px, calc(100% - 36px));
  margin: 0 auto 18px;
  padding: 10px 12px 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(3, 7, 7, 0.26);
  box-shadow: 0 16px 42px rgba(0, 18, 20, 0.18);
}

:global(.v-theme--light) .composer-shell {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(23, 63, 58, 0.14);
  box-shadow: 0 16px 40px rgba(23, 63, 58, 0.1);
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
}

.composer :deep(.v-field__input) {
  padding-top: 8px;
  padding-bottom: 8px;
  min-height: 42px;
  mask-image: none;
}

.send-button {
  width: 42px;
  height: 42px;
  border-radius: 999px;
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 4px 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.74rem;
  line-height: 1.35;
}

:global(.v-theme--light) .composer-footer {
  color: rgba(23, 38, 34, 0.58);
}

.typing-bubble {
  min-width: 72px;
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
  .chat-layout {
    border-radius: 8px;
  }

  .chat-header {
    align-items: flex-start;
    padding: 16px 14px 12px;
  }

  .assistant-mark {
    flex-basis: 40px;
    width: 40px;
    height: 40px;
  }

  .chat-header-actions {
    margin-left: auto;
  }

  .reset-button :deep(.v-btn__content span),
  .recommendations-button :deep(.v-btn__content span) {
    display: none;
  }

  .survey-title {
    font-size: 1.55rem;
    line-height: 1.2;
  }

  .survey-subtitle {
    font-size: 0.82rem;
  }

  .profile-status {
    font-size: 0.72rem;
  }

  .messages-panel {
    padding: 16px 12px;
  }

  .message-avatar {
    display: none;
  }

  .message-stack,
  .message-row.is-user .message-stack {
    max-width: 92%;
  }

  .message-bubble {
    padding: 11px 12px;
  }

  .message-text {
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .composer-shell {
    width: calc(100% - 20px);
  }

  .composer-footer {
    flex-direction: column;
    gap: 6px;
  }

  .composer {
    grid-template-columns: minmax(0, 1fr) 40px;
    gap: 8px;
  }

  .send-button {
    width: 40px;
    height: 40px;
  }

}
</style>
