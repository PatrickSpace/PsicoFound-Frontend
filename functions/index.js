const {GoogleGenAI, Type} = require("@google/genai");
const admin = require("firebase-admin");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

admin.initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "southamerica-east1",
});

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_HTTP_TIMEOUT_MS = 15000;
const CHAT_SESSION_DURATION_MS = 5 * 60 * 1000;
const CHAT_HISTORY_FETCH_LIMIT = 10;
const CHAT_HISTORY_MODEL_LIMIT = 4;
const CRISIS_REPLY =
  "Siento mucho que estes pasando por esto. Si estas en Peru y necesitas " +
  "apoyo urgente en salud mental, llama gratis a la Linea 113 Salud, " +
  "opcion 5, disponible las 24 horas. Si estas en peligro inmediato, " +
  "contacta emergencias o acude al establecimiento de salud mas cercano.";
const SUICIDE_RISK_PATTERNS = [
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+(matarme|suicidarme)\\b",
  ),
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+quitarme la vida\\b",
  ),
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+acabar con mi vida\\b",
  ),
  new RegExp(
      "\\b(quiero|voy a|planeo|pienso|estoy pensando en|estoy por)" +
      "\\s+terminar con mi vida\\b",
  ),
  new RegExp(
      "\\b(tengo|ya tengo)\\s+un plan\\b.*\\b" +
      "(suicidarme|matarme|quitarme la vida)\\b",
  ),
  new RegExp(
      "\\b(suicidarme|matarme|quitarme la vida)\\b.*\\b" +
      "(tengo|ya tengo)\\s+un plan\\b",
  ),
  /\b(voy a|quiero|planeo)\s+(cortarme las venas|tomar pastillas)\b/,
];

const PROFILE_DEFAULTS = {
  motivoConsulta: "",
  soloConversar: false,
  riesgoSuicida: false,
  temas: [],
  enfoque: "",
  preferenciaEdad: "",
  nivelMalestar: "",
  urgencia: "",
  preferenciaGenero: "",
  modalidad: "",
  disponibilidad: [],
  presupuesto: "",
  ciudad: "",
  observaciones: "",
  completado: false,
};

const PROFILE_KEYS = Object.keys(PROFILE_DEFAULTS);

exports.sendProfileChatMessage = onCall(
    {
      minInstances: 0,
      secrets: [GEMINI_API_KEY],
      timeoutSeconds: 60,
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
      }

      const uid = request.auth.uid;
      const message = normalizeMessage(request.data && request.data.message);

      if (!message) {
        throw new HttpsError(
            "invalid-argument",
            "El mensaje no puede estar vacio.",
        );
      }

      if (message.length > 1200) {
        throw new HttpsError(
            "invalid-argument",
            "El mensaje es demasiado largo.",
        );
      }

      const db = admin.firestore();
      const conversationRef = db.collection("conversations").doc(uid);
      const messagesRef = conversationRef.collection("messages");
      const profileRef = db.collection("profiles").doc(uid);
      const conversationSnap = await conversationRef.get();
      const chatSession = getActiveChatSession(conversationSnap.data());

      await conversationRef.set(
          {
            uid,
            type: "profile-survey",
            activeSessionId: chatSession.id,
            sessionStartedAt: chatSession.startedAt,
            sessionExpiresAt: chatSession.expiresAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
      );

      await messagesRef.add({
        sessionId: chatSession.id,
        role: "user",
        text: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const currentProfile = await getCurrentProfile(profileRef);
      const crisisResult = getCrisisResult(message);
      let cleanData;
      let reply;

      if (crisisResult) {
        cleanData = sanitizeProfileData(crisisResult.data);
        reply = crisisResult.reply;
      } else {
        const history = await getRecentHistory(messagesRef, chatSession.id);
        const geminiResult = await askGemini({currentProfile, history});
        cleanData = sanitizeProfileData(geminiResult.data);
        reply = normalizeReply(geminiResult.reply);
      }

      await profileRef.set(
          {
            ...currentProfile,
            ...cleanData,
            uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
      );

      await messagesRef.add({
        sessionId: chatSession.id,
        role: "assistant",
        text: reply,
        data: cleanData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await conversationRef.set(
          {
            lastMessage: reply,
            activeSessionId: chatSession.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
      );

      return {
        reply,
        data: cleanData,
      };
    },
);

exports.resetProfileChatConversation = onCall(
    {
      minInstances: 0,
      timeoutSeconds: 20,
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesion.");
      }

      const uid = request.auth.uid;
      const db = admin.firestore();
      const conversationRef = db.collection("conversations").doc(uid);
      const chatSession = createChatSession();

      await conversationRef.set(
          {
            uid,
            type: "profile-survey",
            activeSessionId: chatSession.id,
            sessionStartedAt: chatSession.startedAt,
            sessionExpiresAt: chatSession.expiresAt,
            lastMessage: "",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
      );

      return {
        activeSessionId: chatSession.id,
      };
    },
);

function normalizeMessage(value) {
  return (value || "").toString().trim();
}

function normalizeReply(value) {
  const fallback = "Gracias por contarme. Sigamos paso a paso.";
  return (value || fallback).toString().trim() || fallback;
}

function getCrisisResult(message) {
  if (!hasClearSuicideRisk(message)) {
    return null;
  }

  return {
    reply: CRISIS_REPLY,
    data: {
      motivoConsulta: "Riesgo suicida expresado por el usuario.",
      soloConversar: false,
      riesgoSuicida: true,
      temas: [],
      enfoque: "indiferente",
      urgencia: "alta",
      observaciones: "Se detecto intencion clara de atentar contra su vida.",
      completado: true,
    },
  };
}

function hasClearSuicideRisk(message) {
  const normalized = normalizeForMatching(message);
  return SUICIDE_RISK_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeForMatching(value) {
  return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
}

async function getCurrentProfile(profileRef) {
  const profileSnap = await profileRef.get();
  const savedProfile = profileSnap.exists ? profileSnap.data() : {};

  return {
    ...PROFILE_DEFAULTS,
    ...sanitizeProfileData(savedProfile),
  };
}

function getActiveChatSession(conversation = {}) {
  const now = Date.now();
  const savedStartedAt = timestampToMillis(conversation.sessionStartedAt);
  const savedSessionId = normalizeMessage(conversation.activeSessionId);
  const hasActiveSession =
    savedSessionId && savedStartedAt &&
    now - savedStartedAt < CHAT_SESSION_DURATION_MS;

  const sessionStartedAt = hasActiveSession ? savedStartedAt : now;
  const sessionId = hasActiveSession ? savedSessionId : `profile-chat-${now}`;

  return buildChatSession(sessionId, sessionStartedAt);
}

function createChatSession() {
  const now = Date.now();
  return buildChatSession(`profile-chat-${now}`, now);
}

function buildChatSession(sessionId, sessionStartedAt) {
  return {
    id: sessionId,
    startedAt: admin.firestore.Timestamp.fromMillis(sessionStartedAt),
    expiresAt: admin.firestore.Timestamp.fromMillis(
        sessionStartedAt + CHAT_SESSION_DURATION_MS,
    ),
  };
}

function timestampToMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return Number(value) || 0;
}

async function getRecentHistory(messagesRef, sessionId) {
  const snapshot = await messagesRef
      .orderBy("createdAt", "desc")
      .limit(CHAT_HISTORY_FETCH_LIMIT)
      .get();

  return snapshot.docs
      .map((doc) => doc.data())
      .filter((item) => item.sessionId === sessionId)
      .slice(0, CHAT_HISTORY_MODEL_LIMIT)
      .reverse()
      .map((item) => {
        const speaker = item.role === "assistant" ? "Asistente" : "Usuario";
        return `${speaker}: ${(item.text || "").toString().trim()}`;
      })
      .filter((line) => line.length > 10)
      .join("\n");
}

async function askGemini({currentProfile, history}) {
  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY.value(),
    httpOptions: {
      timeout: GEMINI_HTTP_TIMEOUT_MS,
    },
  });

  let response;
  const startedAt = Date.now();

  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildPrompt({currentProfile, history}),
      config: {
        temperature: 0.2,
        maxOutputTokens: 600,
        thinkingConfig: {
          thinkingBudget: 0,
        },
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(),
      },
    });
  } catch (error) {
    handleGeminiError(error, Date.now() - startedAt);
  }

  try {
    return JSON.parse(response.text);
  } catch (error) {
    throw new HttpsError(
        "internal",
        "No se pudo interpretar la respuesta de Gemini.",
    );
  }
}

function handleGeminiError(error, elapsedMs = 0) {
  const rawMessage = error && error.message ? error.message : "";
  const message = JSON.stringify(rawMessage);
  const loweredMessage = message.toLowerCase();
  const status = error && error.status;

  console.error("Gemini request failed", {
    status,
    elapsedMs,
    message: rawMessage.toString().slice(0, 500),
  });

  if (status === 429 || message.includes("RESOURCE_EXHAUSTED")) {
    throw new HttpsError(
        "resource-exhausted",
        "Gemini no tiene cuota o creditos disponibles en este momento.",
    );
  }

  if (
    elapsedMs >= GEMINI_HTTP_TIMEOUT_MS - 1000 ||
    loweredMessage.includes("timeout") ||
    loweredMessage.includes("deadline") ||
    loweredMessage.includes("abort") ||
    loweredMessage.includes("etimedout")
  ) {
    throw new HttpsError(
        "deadline-exceeded",
        "Gemini tardo demasiado. Intenta con un mensaje mas breve.",
    );
  }

  throw new HttpsError(
      "internal",
      "No pudimos procesar el mensaje con Gemini en este momento.",
  );
}

function buildPrompt({currentProfile, history}) {
  return `
Eres el asistente conversacional de PsicoFound.
Objetivo unico: recolectar los criterios que usa el motor deterministico de
recomendacion de psicologos. Conversa con calidez profesional para hacer una
admision breve, pero no hagas terapia. No recomiendes psicologos, no
diagnostiques, no prometas resultados y no des consejos, tecnicas, ejercicios,
planes de accion ni indicaciones clinicas.

El motor usa estos campos:
CRISIS. riesgoSuicida: true si hay intencion clara de atentar contra su vida.
0. soloConversar: true si el usuario quiere solo conversar sin filtrar por
   problema ni enfoque.
1. temas: especialidades del psicologo.
2. modalidad: online, presencial, hibrido o indiferente.
3. preferenciaGenero: masculino, femenino o indiferente.
4. enfoque: Humanista, Cognitivo-Conductual, Psicoanalisis, Terapia Familiar,
   Integrativo o indiferente.
5. preferenciaEdad: 18-25, 25-35, 35-45, +45 o indiferente.

Responde en maximo 2 frases. Haz solo 1 pregunta breve, salvo en modo crisis,
donde la respuesta debe priorizar ayuda inmediata y no necesita pregunta.
Extrae datos aunque el usuario responda de forma informal.

Modo crisis por riesgo suicida:
- Si el usuario expresa una intencion clara de atentar contra su vida, quitarse
  la vida, suicidarse, hacerse dano mortal, tener un plan o estar por hacerlo,
  activa modo crisis.
- En modo crisis guarda riesgoSuicida=true, urgencia="alta", completado=true,
  temas=[] y enfoque="indiferente".
- En modo crisis ignora todos los criterios del algoritmo; la app mostrara una
  lista de psicologos disponibles sin filtrar.
- En modo crisis NO hagas preguntas de matching, NO des consejos, NO des
  tecnicas y NO intentes hacer contencion prolongada.
- La respuesta debe ser breve, directa y orientada a ayuda inmediata. Incluye:
  "Si estas en Peru y necesitas apoyo urgente en salud mental, llama gratis a
  la Linea 113 Salud, opcion 5, disponible las 24 horas."
- Tambien indica que si esta en peligro inmediato debe contactar emergencias o
  acudir al establecimiento de salud mas cercano.
- No actives riesgoSuicida por tristeza, ansiedad o frases vagas si no hay
  intencion clara. Si es ambiguo, pregunta de forma breve si esta en peligro
  inmediato o pensando en hacerse dano ahora.

Opcion especial "solo quiero conversar":
- Detecta senales de que el usuario busca principalmente conversar, ser
  escuchado, desahogarse, hablar con alguien o no tiene un problema especifico.
- Si el usuario lo dice de forma explicita, guarda soloConversar=true.
- Si la intencion parece probable pero no esta clara, NO asumas. Haz una
  pregunta directa y breve: "Para orientarte mejor, estas buscando
  principalmente conversar con un terapeuta sin enfocarte en un problema
  especifico?"
- Si el usuario confirma, guarda soloConversar=true, temas=[] y
  enfoque="indiferente".
- Si el usuario no confirma o menciona un problema especifico, guarda
  soloConversar=false y continua el flujo normal.
- En modo soloConversar, el problema a resolver y el enfoque terapeutico NO
  influyen en el matching.
- En modo soloConversar NO preguntes por temas ni por estilo/enfoque de ayuda.
- En modo soloConversar pregunta solo preferencias practicas en este orden:
  modalidad, preferenciaGenero, preferenciaEdad.
- En modo soloConversar completado=true cuando modalidad, preferenciaGenero y
  preferenciaEdad tengan valor o fueron marcados como indiferente.

Si soloConversar=false o el usuario menciona un problema especifico, pregunta
por el primer criterio faltante en este orden:
temas, modalidad, preferenciaGenero, enfoque, preferenciaEdad.

Regla importante para enfoque:
- No preguntes "que enfoque terapeutico prefieres?".
- El usuario normalmente no conoce enfoques tecnicos.
- Si falta enfoque, pregunta de forma coloquial por el estilo de ayuda que le
  gustaria recibir.
- Usa opciones simples, por ejemplo: "prefieres algo practico con herramientas,
  un espacio de escucha profunda, trabajar vinculos/familia, o una mezcla?".
- Traduce la respuesta internamente:
  practico, herramientas, tareas, habitos => Cognitivo-Conductual.
  escucha, comprender, emociones, acompanamiento cercano => Humanista.
  historia personal, pasado, patrones profundos => Psicoanalisis.
  pareja, familia, vinculos, comunicacion => Terapia Familiar.
  mezcla, no sabe, flexible, combinar estilos => Integrativo.
- Si el usuario dice que le da igual o no sabe, guarda "indiferente".
- En la respuesta al usuario no uses nombres tecnicos salvo que el usuario los
  mencione primero.

No preguntes por nivel de malestar, ciudad, presupuesto ni disponibilidad como
parte del flujo principal. Esos campos no bloquean el matching actual.
motivoConsulta debe ser un resumen breve del motivo en lenguaje natural.

Estilo de conversacion:
- Usa escucha empatica breve, similar a una admision profesional.
- Valida sin interpretar ni aconsejar. Ejemplo: "Entiendo, gracias por
  contarmelo."
- Despues de validar, haz una sola pregunta de recopilacion, salvo en modo
  crisis.
- No expliques que estas haciendo matching ni menciones el algoritmo.

Para temas usa nombres cercanos a este catalogo:
Ansiedad, Depresion, Trauma infantil, Problemas de autoestima, Problemas de
pareja, Ansiedad social, Abuso de sustancias, Problemas laborales,
Procrastinacion, Problemas familiares, Problemas de identidad.

Si el usuario no tiene preferencia de genero, modalidad, enfoque o edad, guarda
"indiferente" en el campo correspondiente.

nivelMalestar y urgencia solo se infieren si el usuario lo expresa de forma
espontanea o si hay senales de riesgo. Nunca hagas una pregunta directa sobre
"malestar actual" ni uses escalas clinicas.
Marca urgencia alta solo si hay riesgo de dano, ideacion suicida, violencia o
crisis. En urgencia alta, da contencion breve y recomienda buscar ayuda
inmediata/local.

completado=true solo si hay suficiente informacion para el recomendador:
temas, modalidad, preferenciaGenero, enfoque y preferenciaEdad tienen valor
o fueron marcados como indiferente. Excepcion: si soloConversar=true, temas y
enfoque no son requeridos.

Perfil actual:
${JSON.stringify(currentProfile)}

Historial reciente:
${history || "Sin historial previo."}

Devuelve solo JSON con esta forma:
{
  "reply": "mensaje conversacional para el usuario",
  "data": { "perfil parcial actualizado": "solo campos conocidos" }
}
`;
}

function buildResponseSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      reply: {type: Type.STRING},
      data: {
        type: Type.OBJECT,
        properties: {
          motivoConsulta: {type: Type.STRING},
          soloConversar: {type: Type.BOOLEAN},
          riesgoSuicida: {type: Type.BOOLEAN},
          temas: {
            type: Type.ARRAY,
            items: {type: Type.STRING},
          },
          enfoque: {type: Type.STRING},
          preferenciaEdad: {type: Type.STRING},
          nivelMalestar: {type: Type.STRING},
          urgencia: {type: Type.STRING},
          preferenciaGenero: {type: Type.STRING},
          modalidad: {type: Type.STRING},
          disponibilidad: {
            type: Type.ARRAY,
            items: {type: Type.STRING},
          },
          presupuesto: {type: Type.STRING},
          ciudad: {type: Type.STRING},
          observaciones: {type: Type.STRING},
          completado: {type: Type.BOOLEAN},
        },
      },
    },
    required: ["reply", "data"],
  };
}

function sanitizeProfileData(data = {}) {
  return PROFILE_KEYS.reduce((profile, key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      return profile;
    }

    const value = data[key];

    if (Array.isArray(PROFILE_DEFAULTS[key])) {
      profile[key] = Array.isArray(value) ? cleanStringArray(value) : [];
      return profile;
    }

    if (typeof PROFILE_DEFAULTS[key] === "boolean") {
      profile[key] = Boolean(value);
      return profile;
    }

    profile[key] = (value || "").toString().trim();
    return profile;
  }, {});
}

function cleanStringArray(value) {
  return value
      .map((item) => (item || "").toString().trim())
      .filter(Boolean)
      .slice(0, 12);
}
