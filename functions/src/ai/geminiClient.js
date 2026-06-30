const {GoogleGenAI, Type} = require("@google/genai");
const {HttpsError} = require("firebase-functions/v2/https");
const {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_HTTP_TIMEOUT_MS,
} = require("../config");
const {buildPrompt} = require("./profilePrompt");

async function askGemini({currentProfile, history, latestUserMessage}) {
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
      contents: buildPrompt({currentProfile, history, latestUserMessage}),
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
        },
      },
    },
    required: ["reply", "data"],
  };
}

module.exports = {
  askGemini,
};
