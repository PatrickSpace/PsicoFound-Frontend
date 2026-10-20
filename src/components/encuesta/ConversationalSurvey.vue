<template>
  <section class="survey-shell">
    <AccountAccessCard @access="accountAllowed = $event" @status="applySurveyStatus" />
    <v-btn class="pf-btn-ghost mb-2" to="/elegirterapeuta?crisis=1">Consultar recursos de ayuda</v-btn>
    <div class="chat-layout">
      <div class="chat-header">
        <div class="assistant-mark" aria-hidden="true">
          <v-icon size="24">mdi-message-processing-outline</v-icon>
        </div>
        <div class="chat-heading">
          <p class="text-caption text-medium-emphasis mb-1">
            {{ surveyInputMode === "guided" ? "Encuesta guiada" : "Encuesta conversacional" }}
          </p>
          <h1 class="survey-title font-weight-bold">
            <span class="desktop-copy">Cuéntame cómo te sientes</span>
            <span class="mobile-copy">¿Cómo te sientes?</span>
          </h1>
          <p class="survey-subtitle text-body-2 text-medium-emphasis">
            <span class="desktop-copy">
              Te haré algunas preguntas para entender tu situación actual y
              sugerirte psicólogos afines.
            </span>
            <span class="mobile-copy">
              Te haré unas preguntas para orientarte mejor.
            </span>
          </p>
          <v-menu
            open-on-hover
            location="bottom start"
            :close-on-content-click="false"
            transition="fade-transition"
          >
            <template #activator="{ props }">
              <div
                v-bind="props"
                class="profile-status"
                :class="{ 'is-ready': canViewRecommendations }"
                tabindex="0"
              >
                <v-icon size="15">
                  {{
                    canViewRecommendations
                      ? "mdi-check-circle-outline"
                      : "mdi-progress-clock"
                  }}
                </v-icon>
                <span>{{
                  canViewRecommendations ? "Perfil listo" : "Perfil en progreso"
                }}</span>
              </div>
            </template>

            <div class="profile-popover">
              <div class="profile-popover-title">Perfil registrado</div>
              <div
                v-if="profileSummaryItems.length"
                class="profile-popover-list"
              >
                <div
                  v-for="item in profileSummaryItems"
                  :key="item.label"
                  class="profile-popover-row"
                >
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
              <p v-else class="profile-popover-empty">
                Aún no hay datos registrados.
              </p>
              <v-btn
                v-if="activeSessionId"
                class="mt-3 pf-btn-secondary"
                block
                color="secondary"
                variant="tonal"
                size="small"
                prepend-icon="mdi-pencil-outline"
                @click="openProfileEditor"
              >
                Corregir perfil
              </v-btn>
            </div>
          </v-menu>
        </div>

        <div class="chat-header-actions">
          <v-btn
            class="reset-button pf-btn-ghost"
            aria-label="Reiniciar"
            variant="text"
            color="secondary"
            size="small"
            prepend-icon="mdi-refresh"
            :loading="resetting"
            :disabled="loading || resetting"
            @click="resetDialog = true"
          >
            Reiniciar
          </v-btn>
          <v-btn
            v-if="canViewRecommendations"
            class="recommendations-button pf-btn-primary"
            aria-label="Ver psicólogos"
            variant="flat"
            color="primary"
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
          <v-btn v-if="historyHasMore" variant="text" :loading="loadingHistory" @click="loadEarlierMessages">
            Cargar mensajes anteriores
          </v-btn>
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
            <div
              v-if="message.role !== 'user'"
              class="message-avatar"
              aria-hidden="true"
            >
              <v-icon size="18">mdi-heart-outline</v-icon>
            </div>
            <div class="message-stack">
              <div class="message-author">
                {{ message.role === "user" ? "Tú" : "Lurems" }}
              </div>
              <div class="message-bubble">
                <p class="message-text">{{ message.text }}</p>
                <div
                  v-if="message.pending || message.error"
                  class="message-status"
                >
                  {{ message.error ? "No enviado" : "Enviando..." }}
                </div>
              </div>
              <v-btn
                v-if="message.role === 'user' && message.error"
                class="retry-message-button pf-btn-ghost"
                size="x-small"
                color="secondary"
                variant="text"
                prepend-icon="mdi-refresh"
                :disabled="loading"
                @click="retryMessage(message)"
              >
                Reintentar sin duplicar
              </v-btn>
              <div
                v-if="
                  message.role !== 'user' && getMessageOptions(message).length
                "
                class="message-options"
              >
                <button
                  v-for="option in getMessageOptions(message)"
                  :key="`${message.id}-${option.label}-${option.value}`"
                  type="button"
                  class="message-option"
                  :disabled="loading || startingSurvey || !accountAllowed"
                  @click="handleOptionClick(option)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="loading" class="message-row is-assistant">
            <div class="message-avatar" aria-hidden="true">
              <v-icon size="18">mdi-heart-outline</v-icon>
            </div>
            <div class="message-stack">
              <div class="message-author">Lurems</div>
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
        <p v-if="surveyInputMode === 'guided'" class="text-body-2 mb-3" role="status">
          {{ canViewRecommendations ? "Tus preferencias están listas. Puedes ver psicólogos o ajustar tus respuestas." : "Elige una respuesta para continuar. Las demás preferencias son opcionales." }}
        </p>
        <v-alert v-if="startError" color="error" variant="tonal" class="mb-3">
          {{ startError }}
          <v-btn variant="text" :loading="startingSurvey" @click="ensureSurveyStarted">Reintentar inicio</v-btn>
        </v-alert>
        <v-btn v-if="activeSessionId" variant="tonal" class="mb-3 pf-btn-secondary" :disabled="loading || savingProfile" @click="openProfileEditor">
          Ajustar preferencias (opcional)
        </v-btn>
        <form v-if="surveyInputMode === 'conversational'" class="composer" @submit.prevent="handleSubmit">
          <v-textarea
            v-model="draft"
            auto-grow
            rows="1"
            max-rows="5"
            variant="plain"
            hide-details
            :disabled="loading"
            placeholder="Escribe cómo te sientes..."
            @keydown.enter.exact.prevent="handleSubmit"
          />

          <v-btn
            class="send-button pf-btn-icon"
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
          <span
            >Tu información ayuda a orientar la recomendación, no reemplaza
            diagnóstico clínico.</span
          >
        </div>
      </div>
    </div>

    <v-dialog v-model="resetDialog" max-width="560">
      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
          Reiniciar encuesta
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <p class="text-body-2 mb-4">Para continuar solo necesitas un tema o elegir «solo conversar» y una modalidad. Las demás preferencias son opcionales.</p>
          <p class="text-body-2 mb-3">
            Iniciarás una encuesta nueva y se reiniciarán el resumen y las recomendaciones.
            Los mensajes anteriores se conservan; reiniciar no es una solicitud de eliminación.
          </p>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Se conservarán tu cuenta, terapias, citas, objetivos, ejercicios y
            registros emocionales.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resetDialog = false">Volver</v-btn>
          <v-btn
            color="secondary"
            variant="tonal"
            :loading="resetting"
            @click="handleResetConversation"
          >
            Reiniciar encuesta
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="profileDialog" max-width="680">
      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
          Corregir perfil de búsqueda
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <v-alert
            v-if="profileEditError"
            class="mb-4"
            color="error"
            variant="tonal"
          >
            {{ profileEditError }}
          </v-alert>
          <v-switch
            v-model="profileForm.soloConversar"
            color="secondary"
            label="Solo quiero conversar, sin un tema específico"
          />
          <v-textarea
            v-model="profileForm.motivoConsulta"
            label="Resumen o motivo principal"
            variant="outlined"
            rows="2"
          />
          <v-combobox
            v-model="profileForm.temas"
            label="Temas"
            :items="topicOptions"
            multiple
            chips
            clearable
            variant="outlined"
          />
          <v-row>
            <v-col cols="12" sm="6">
              <v-select
                v-model="profileForm.modalidad"
                label="Modalidad"
                :items="modalityOptions"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="profileForm.preferenciaGenero"
                label="Género del profesional (opcional)"
                clearable
                :items="genderOptions"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="profileForm.enfoque"
                label="Tipo de acompañamiento (opcional)"
                clearable
                :items="approachOptions"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="profileForm.preferenciaEdad"
                label="Rango de edad (opcional)"
                clearable
                :items="ageOptions"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-textarea
            v-model="profileForm.observaciones"
            label="Observaciones"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="profileDialog = false">Cancelar</v-btn>
          <v-btn
            color="secondary"
            variant="tonal"
            :loading="savingProfile"
            @click="saveProfileCorrections"
          >
            Guardar correcciones
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import AccountAccessCard from "@/components/auth/AccountAccessCard.vue";
import {
  resetProfileChatConversation,
  startProfileChatConversation,
  sendProfileChatMessage,
  updateProfilePreferences,
  watchConversation,
  watchConversationMessages,
  loadEarlierConversationMessages,
  watchProfile,
} from "@/services/conversationService";
import {
  isProfileReadyForRecommendations,
} from "@/services/matchingService";

const router = useRouter();
const authStore = useAuthStore();

const draft = ref("");
const accountAllowed = ref(false);
const surveyInputMode = ref("guided");
const startingSurvey = ref(false);
const startError = ref("");
const loading = ref(false);
const resetting = ref(false);
const messages = ref([]);
const optimisticMessages = ref([]);
const profile = ref(null);
const messagesContainer = ref(null);
const activeSessionId = ref("");
const activeTurn = ref(null);
let contextGeneration = 0;
let sendGeneration = 0;
const earlierMessages = ref([]);
const historyHasMore = ref(false);
const loadingHistory = ref(false);
let historyCursor = null;
let resetRequestId = null;
const crisisRouteTriggered = ref(false);
const resetDialog = ref(false);
const profileDialog = ref(false);
const savingProfile = ref(false);
const profileEditError = ref("");
const profileForm = reactive({
  motivoConsulta: "",
  soloConversar: false,
  temas: [],
  modalidad: "",
  preferenciaGenero: "",
  enfoque: "",
  preferenciaEdad: "",
  observaciones: "",
});
const topicOptions = [
  "Ansiedad",
  "Depresión",
  "Problemas de autoestima",
  "Problemas de pareja",
  "Problemas familiares",
  "Problemas laborales",
];
const modalityOptions = ["Online", "Presencial", "Híbrido", "indiferente"];
const genderOptions = ["Femenino", "Masculino", "indiferente"];
const approachOptions = [
  "Algo práctico con herramientas",
  "Un espacio de escucha profunda",
  "Trabajar vínculos o familia",
  "Una mezcla flexible",
  "indiferente",
];
const ageOptions = ["25-35", "35-45", "+45", "indiferente"];

let unsubscribeConversation = null;
let unsubscribeMessages = null;
let unsubscribeProfile = null;

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hola, soy Lurems. Cuéntame qué tipo de apoyo buscas.",
  suggestedOptions: [
    { label: "Ansiedad", value: "Ansiedad", field: "temas" },
    { label: "Depresión", value: "Depresión", field: "temas" },
    { label: "Autoestima", value: "Problemas de autoestima", field: "temas" },
    { label: "Pareja", value: "Problemas de pareja", field: "temas" },
    { label: "Solo conversar", value: "Solo quiero conversar", field: "temas" },
  ],
};

const visibleMessages = computed(() => {
  const mergedMessages = [
    ...earlierMessages.value,
    ...messages.value,
    ...optimisticMessages.value.filter(
      (optimisticMessage) => !hasConfirmedMessage(optimisticMessage)
    ),
  ];
  const uniqueMessages = [...new Map(mergedMessages.map(item => [item.id, item])).values()].sort(compareMessagesByCreatedAt);

  const turn = activeTurn.value;
  if (turn?.status === "active" && !uniqueMessages.some(item => item.turnId === turn.id)) {
    return [...uniqueMessages, {id: `turn-${turn.id}`, role: "assistant", text: turn.question,
      turnId: turn.id, suggestedOptions: turn.options}];
  }
  return uniqueMessages.length > 0 ? uniqueMessages : [{...welcomeMessage,
    ...(turn ? {text: turn.question || "Tus preferencias están listas. Puedes ajustarlas o ver psicólogos.",
      turnId: turn.id, suggestedOptions: turn.options} : {})}];
});

const canSend = computed(() => accountAllowed.value && draft.value.trim().length > 0 && !loading.value);
const canViewRecommendations = computed(() => {
  if (
    !activeSessionId.value ||
    profile.value?.sessionId !== activeSessionId.value
  ) {
    return false;
  }

  return isProfileReadyForRecommendations(profile.value);
});
const profileSummaryItems = computed(() => {
  if (
    !activeSessionId.value ||
    profile.value?.sessionId !== activeSessionId.value
  ) {
    return [];
  }

  const currentProfile = profile.value || {};
  const items = [
    ["Motivo", currentProfile.motivoConsulta],
    ["Temas", currentProfile.temas],
    ["Modalidad", currentProfile.modalidad],
    ["Género", currentProfile.preferenciaGenero],
    ["Enfoque", currentProfile.enfoque],
    ["Edad", currentProfile.preferenciaEdad],
    ["Urgencia", currentProfile.urgencia],
    ["Malestar", currentProfile.nivelMalestar],
    ["Observaciones", currentProfile.observaciones],
  ];

  if (currentProfile.soloConversar) {
    items.unshift(["Tipo de apoyo", "Solo conversar"]);
  }

  if (currentProfile.riesgoSuicida) {
    items.unshift(["Riesgo", "Requiere apoyo urgente"]);
  }

  return items
    .map(([label, value]) => ({
      label,
      value: formatProfileValue(value),
    }))
    .filter((item) => item.value);
});

watch(
  () => authStore.currentUser,
  (user) => {
    contextGeneration++; sendGeneration++;
    const generation = contextGeneration;
    activeSessionId.value = ""; profile.value = null; crisisRouteTriggered.value = false;
    resetting.value = false; savingProfile.value = false; resetRequestId = null;
    profileDialog.value = false; resetDialog.value = false;
    activeTurn.value = null; startingSurvey.value = false; startError.value = "";
    earlierMessages.value = []; historyCursor = null; historyHasMore.value = false; loadingHistory.value = false;
    messages.value = []; optimisticMessages.value = []; draft.value = ""; loading.value = false;
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
        if (generation !== contextGeneration) return;
        const sessionId = conversation?.activeSessionId || "";
        activeTurn.value = conversation?.activeTurn || null;

        if (sessionId === activeSessionId.value) {
          return;
        }

        activeSessionId.value = sessionId;
        earlierMessages.value = []; historyCursor = null; historyHasMore.value = false;
        messages.value = [];
        unsubscribeMessages?.();
        unsubscribeMessages = sessionId
          ? watchConversationMessages(
              user.uid,
              sessionId,
              (items, pagination) => {
                if (generation !== contextGeneration || activeSessionId.value !== sessionId) return;
                const ids = new Set(items.map(item => item.id));
                earlierMessages.value.push(...messages.value.filter(item => !ids.has(item.id)));
                messages.value = items;
                if (!historyCursor) { historyCursor = pagination.cursor; historyHasMore.value = pagination.hasMore; }
                reconcileOptimisticMessages();
                scrollToBottom();
              },
              () => {
                if (generation !== contextGeneration || activeSessionId.value !== sessionId) return;
                notifyError("No pudimos cargar el historial de conversación.");
              }
            )
          : null;
      },
      () => {
        if (generation !== contextGeneration) return;
        notifyError("No pudimos cargar la conversación actual.");
      }
    );

    unsubscribeProfile = watchProfile(
      user.uid,
      (item) => {
        if (generation !== contextGeneration) return;
        profile.value = item;

        if (item?.riesgoSuicida && !crisisRouteTriggered.value) {
          crisisRouteTriggered.value = true;
          router.push({
            path: "/elegirterapeuta",
            query: { crisis: "1" },
          });
        }
      },
      () => {
        if (generation !== contextGeneration) return;
        notifyError("No pudimos cargar tu perfil de búsqueda.");
      }
    );
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  contextGeneration++;
  unsubscribeConversation?.();
  unsubscribeMessages?.();
  unsubscribeProfile?.();
});

async function loadEarlierMessages() {
  if (loadingHistory.value || !historyHasMore.value) return;
  const generation = contextGeneration, sessionId = activeSessionId.value;
  const uid = authStore.currentUser?.uid;
  loadingHistory.value = true;
  try {
    const page = await loadEarlierConversationMessages(uid, sessionId, historyCursor);
    if (generation !== contextGeneration || sessionId !== activeSessionId.value) return;
    earlierMessages.value.push(...page.items);
    historyCursor = page.cursor; historyHasMore.value = page.hasMore;
  } catch {
    if (generation === contextGeneration) notifyError("No pudimos cargar los mensajes anteriores. Puedes reintentar.");
  } finally {
    if (generation === contextGeneration) loadingHistory.value = false;
  }
}

async function handleSubmit() {
  const message = draft.value.trim();

  if (!message || loading.value) {
    return;
  }

  draft.value = "";

  await sendChatMessage(message);
}

function applySurveyStatus(status) {
  surveyInputMode.value = status?.survey?.inputMode || "conversational";
  if (status?.allowed) ensureSurveyStarted();
}

async function ensureSurveyStarted() {
  if (!accountAllowed.value || startingSurvey.value) return;
  const generation = contextGeneration;
  startingSurvey.value = true;
  startError.value = "";
  try {
    const result = await startProfileChatConversation();
    if (generation !== contextGeneration) return;
    activeTurn.value = result.activeTurn;
    syncProfileFromChatResult(result);
  } catch {
    if (generation === contextGeneration) startError.value = "No pudimos iniciar la encuesta. Intenta nuevamente.";
  } finally {
    if (generation === contextGeneration) startingSurvey.value = false;
  }
}

async function handleOptionClick(option) {
  const message = (option?.value || option?.label || "").toString().trim();

  if (!message || loading.value) {
    return;
  }

  draft.value = "";
  await sendChatMessage(message, null, option);
}

async function sendChatMessage(message, retryingMessage = null, option = null) {
  const generation = contextGeneration;
  const sending = sendGeneration;
  if (!accountAllowed.value) return;
  loading.value = true;
  const optimisticMessage = retryingMessage || addOptimisticMessage(message);
  if (!retryingMessage) optimisticMessage.context = {sessionId: activeSessionId.value, turnId: activeTurn.value?.id || "", ...(option ? {option} : {})};
  if (retryingMessage) {
    optimisticMessages.value = optimisticMessages.value.map((item) =>
      item.id === retryingMessage.id
        ? { ...item, error: false, pending: true }
        : item
    );
  }
  scrollToBottom();

  try {
    const result = await sendProfileChatMessage(
      message,
      optimisticMessage.requestId, optimisticMessage.context
    );
    if ((generation !== contextGeneration || sending !== sendGeneration) || (activeSessionId.value && result.sessionId !== activeSessionId.value)) return;
    activeTurn.value = result.activeTurn;
    syncProfileFromChatResult(result);
  } catch (err) {
    if ((generation !== contextGeneration || sending !== sendGeneration)) return;
    markOptimisticMessageAsFailed(optimisticMessage.id);
    notifyError(
      getReadableErrorMessage(err) ||
        "No pudimos enviar el mensaje. Inténtalo nuevamente en unos segundos."
    );
  } finally {
    if ((generation !== contextGeneration || sending !== sendGeneration)) return;
    loading.value = false;
    scrollToBottom();
  }
}

function retryMessage(message) {
  if (!message?.error || loading.value) return;
  sendChatMessage(message.text, message);
}

async function handleResetConversation() {
  if (loading.value || resetting.value) {
    return;
  }

  resetting.value = true;
  draft.value = "";

  const generation = contextGeneration;
  try {
    resetRequestId ||= globalThis.crypto.randomUUID();
    await resetProfileChatConversation(resetRequestId);
    if (generation !== contextGeneration) return;
    sendGeneration++;
    resetRequestId = null;
    messages.value = [];
    optimisticMessages.value = [];
    profile.value = null;
    resetDialog.value = false;
  } catch (err) {
    if (generation !== contextGeneration) return;
    notifyError(
      getReadableErrorMessage(err) ||
        "No pudimos reiniciar la conversación. Inténtalo nuevamente."
    );
  } finally {
    if (generation !== contextGeneration) return;
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
  const requestId = `chat_${globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.random().toString(36).slice(2)}`}`.replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
  const optimisticMessage = {
    id: `optimistic-${requestId}`,
    requestId,
    role: "user",
    text,
    pending: true,
    localCreatedAt: Date.now(),
    sessionId: activeSessionId.value || "",
  };

  optimisticMessages.value = [...optimisticMessages.value, optimisticMessage];
  return optimisticMessage;
}

function openProfileEditor() {
  const current = profile.value || {};
  Object.assign(profileForm, {
    motivoConsulta: current.motivoConsulta || "",
    soloConversar: Boolean(current.soloConversar),
    temas: Array.isArray(current.temas) ? [...current.temas] : [],
    modalidad: current.modalidad || "",
    preferenciaGenero: current.preferenciaGenero || "",
    enfoque: current.enfoque || "",
    preferenciaEdad: current.preferenciaEdad || "",
    observaciones: current.observaciones || "",
  });
  profileEditError.value = "";
  profileDialog.value = true;
}

async function saveProfileCorrections() {
  if (savingProfile.value) return;
  savingProfile.value = true;
  profileEditError.value = "";
  const generation = contextGeneration;
  try {
    const result = await updateProfilePreferences({
      ...profileForm,
      temas: profileForm.soloConversar ? [] : profileForm.temas,
    }, { sessionId: activeSessionId.value, turnId: activeTurn.value?.id || "" });
    if (generation !== contextGeneration) return;
    profile.value = result.profile;
    activeTurn.value = result.activeTurn;
    profileDialog.value = false;
  } catch (error) {
    if (generation !== contextGeneration) return;
    profileEditError.value =
      getReadableErrorMessage(error) || "No pudimos guardar las correcciones.";
  } finally {
    if (generation !== contextGeneration) return;
    savingProfile.value = false;
  }
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
  return getMessageCreatedAt(a) - getMessageCreatedAt(b) ||
    (a.role === "user" ? 0 : 1) - (b.role === "user" ? 0 : 1);
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
  router.push("/elegirterapeuta");
}

function getMessageOptions(message) {
  if (!activeTurn.value || message?.turnId !== activeTurn.value.id) return [];
  return Array.isArray(message?.suggestedOptions)
    ? message.suggestedOptions.filter(
        (option) => option?.label && option?.value
      )
    : [];
}

function formatProfileValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "";
  }

  return (value || "").toString().trim();
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
  --chat-surface: rgb(var(--v-theme-surface));

  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-border-subtle));
  border-radius: 16px;
  background: var(--chat-surface);
  color: rgb(var(--v-theme-text-primary));
  box-shadow: var(--pf-shadow-lg);
}

:global(.v-theme--light .chat-layout) {
  --chat-surface: rgb(var(--v-theme-surface));
  background: var(--chat-surface);
  border-color: rgb(var(--v-theme-border-subtle));
  box-shadow: var(--pf-shadow-sm);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-border-subtle), 0.1);
}

:global(.v-theme--light .chat-header) {
  border-bottom-color: rgba(var(--v-theme-border-subtle), 0.1);
}

.assistant-mark {
  display: grid;
  place-items: center;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-secondary));
  background: rgb(var(--v-theme-primary));
  box-shadow: var(--pf-shadow-sm);
}

.assistant-mark .v-icon {
  color: rgb(var(--v-theme-on-primary)) !important;
  opacity: 1;
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

.mobile-copy {
  display: none;
}

.profile-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 5px 8px;
  border: 1px solid rgba(var(--v-theme-border-subtle), 0.08);
  border-radius: 999px;
  color: rgba(var(--v-theme-text-secondary), 0.66);
  background: rgba(var(--v-theme-surface-glass), 0.14);
  box-shadow: var(--pf-shadow-xs);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1;
  width: fit-content;
}

:global(.v-theme--light .profile-status) {
  color: var(--color-primary-dark);
  background: var(--color-primary-soft);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.profile-status.is-ready {
  color: rgb(var(--v-theme-success));
}

.profile-popover {
  width: min(320px, calc(100vw - 32px));
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-border-subtle), 0.12);
  border-radius: 8px;
  color: rgba(var(--v-theme-text-primary), 0.88);
  background: rgba(var(--v-theme-surface-elevated), 0.96);
  box-shadow: var(--pf-shadow-md);
  backdrop-filter: blur(var(--pf-blur-md));
}

:global(.v-theme--light .profile-popover) {
  color: rgba(var(--v-theme-text-primary), 0.88);
  background: rgba(var(--v-theme-surface-elevated), 0.98);
  border-color: rgba(
    var(--v-theme-border-subtle),
    var(--pf-border-subtle-alpha)
  );
  box-shadow: var(--pf-shadow-md);
  backdrop-filter: none;
}

.profile-popover-title {
  margin-bottom: 9px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.profile-popover-list {
  display: grid;
  gap: 7px;
}

.profile-popover-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  font-size: 0.76rem;
  line-height: 1.35;
}

.profile-popover-row span {
  color: rgba(var(--v-theme-text-secondary), 0.58);
}

:global(.v-theme--light .profile-popover-row span) {
  color: rgba(var(--v-theme-text-secondary), 0.56);
}

.profile-popover-row strong {
  overflow-wrap: anywhere;
  font-weight: 700;
}

.profile-popover-empty {
  margin: 0;
  color: rgba(var(--v-theme-text-secondary), 0.62);
  font-size: 0.78rem;
  line-height: 1.4;
}

:global(.v-theme--light .profile-popover-empty) {
  color: rgba(var(--v-theme-text-secondary), 0.6);
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
  background: var(--chat-surface);
}

.messages-panel::-webkit-scrollbar {
  width: 10px;
}

.messages-panel::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-surface-glass), 0.18);
  border-radius: 999px;
}

:global(.v-theme--light .messages-panel::-webkit-scrollbar-track) {
  background: rgba(var(--v-theme-surface-hover), 0.08);
}

.messages-panel::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-brand-secondary), 0.58);
  border-radius: 999px;
}

:global(.v-theme--light .messages-panel::-webkit-scrollbar-thumb) {
  background: rgba(var(--v-theme-brand-secondary), 0.5);
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
  background: rgb(var(--v-theme-background-secondary));
  border: 1px solid rgb(var(--v-theme-border-subtle));
}

:global(.v-theme--light .message-bubble) {
  background: rgb(var(--v-theme-background-secondary));
  border-color: rgb(var(--v-theme-border-subtle));
}

.message-row.is-user .message-bubble {
  color: rgb(var(--v-theme-on-secondary));
  background: rgb(var(--v-theme-secondary));
  border-color: transparent;
}

:global(.v-theme--light .message-row.is-user .message-bubble) {
  color: rgb(var(--v-theme-on-secondary));
  background: rgb(var(--v-theme-secondary));
}

.message-author {
  margin-bottom: 5px;
  font-size: 0.76rem;
  font-weight: 700;
  color: rgba(var(--v-theme-text-secondary), 0.72);
}

:global(.v-theme--light .message-author) {
  color: rgba(var(--v-theme-text-secondary), 0.72);
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
  color: rgba(var(--v-theme-text-secondary), 0.62);
}

:global(.v-theme--light .message-status) {
  color: rgba(var(--v-theme-text-secondary), 0.56);
}

.message-options {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.message-option {
  min-height: 30px;
  padding: 6px 10px;
  border: 1.5px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-radius: 999px;
  color: var(--color-primary-dark);
  background: var(--color-button-secondary-bg);
  box-shadow: none;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.15;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, transform 0.18s ease;
}

.message-option:hover:not(:disabled),
.message-option:focus-visible:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-primary) 52%, transparent);
  color: var(--color-primary-dark);
  background: var(--color-button-secondary-hover);
  outline: none;
  transform: translateY(-1px);
}

.message-option:disabled {
  cursor: default;
  opacity: 0.46;
}

:global(.v-theme--light .message-option) {
  color: var(--color-primary-dark);
  background: var(--color-button-secondary-bg);
  border-color: color-mix(in srgb, var(--color-primary) 28%, transparent);
}

:global(.v-theme--light .message-option:hover:not(:disabled)),
:global(.v-theme--light .message-option:focus-visible:not(:disabled)) {
  background: var(--color-button-secondary-hover);
  color: var(--color-primary-dark);
}

:global(.v-theme--dark .message-option) {
  color: rgb(var(--v-theme-text-primary));
  border-color: rgba(var(--v-theme-border-subtle), 0.28);
}

:global(.v-theme--dark .message-option:hover:not(:disabled)),
:global(.v-theme--dark .message-option:focus-visible:not(:disabled)) {
  color: rgb(var(--v-theme-text-primary));
  border-color: rgba(var(--v-theme-border-default), 0.48);
}

.composer-shell {
  width: min(760px, calc(100% - 36px));
  margin: 0 auto 18px;
  padding: 10px 12px 9px;
  border: 1px solid rgba(var(--v-theme-border-subtle), 0.12);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: var(--pf-shadow-sm);
}

:global(.v-theme--light .composer-shell) {
  background: rgb(var(--v-theme-surface));
  border-color: rgb(var(--v-theme-border-subtle));
  box-shadow: var(--pf-shadow-xs);
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

.composer :deep(textarea) {
  color: rgb(var(--v-theme-text-primary));
}

.composer :deep(textarea::placeholder) {
  color: rgb(var(--v-theme-text-secondary));
  opacity: 0.82;
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
  color: rgba(var(--v-theme-text-secondary), 0.58);
  font-size: 0.74rem;
  line-height: 1.35;
}

:global(.v-theme--light .composer-footer) {
  color: rgba(var(--v-theme-text-secondary), 0.58);
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
  background: rgba(var(--v-theme-text-primary), 0.76);
  animation: pulse 1s infinite ease-in-out;
}

:global(.v-theme--light .typing-dots span) {
  background: rgba(var(--v-theme-brand-primary), 0.72);
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
    gap: 10px;
    padding: 14px 12px 10px;
  }

  .assistant-mark {
    flex-basis: 40px;
    width: 40px;
    height: 40px;
  }

  .chat-header-actions {
    margin-left: auto;
  }

  .reset-button {
    width: 36px;
    min-width: 36px;
    padding: 0;
  }

  .reset-button :deep(.v-btn__content),
  .recommendations-button :deep(.v-btn__content) {
    display: none;
  }

  .desktop-copy {
    display: none;
  }

  .mobile-copy {
    display: inline;
  }

  .survey-title {
    font-size: 1.45rem;
    line-height: 1.2;
  }

  .survey-subtitle {
    display: none;
  }

  .profile-status {
    font-size: 0.72rem;
    margin-top: 7px;
  }

  .messages-panel {
    padding: 14px 12px;
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
    margin-bottom: 12px;
  }

  .composer-footer {
    display: none;
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
