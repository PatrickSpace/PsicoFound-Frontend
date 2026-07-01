function buildProfileChatResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      reply: {type: "STRING"},
      suggestedOptions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            label: {type: "STRING"},
            value: {type: "STRING"},
            field: {type: "STRING"},
          },
        },
      },
      data: {
        type: "OBJECT",
        properties: {
          motivoConsulta: {type: "STRING"},
          soloConversar: {type: "BOOLEAN"},
          riesgoSuicida: {type: "BOOLEAN"},
          temas: {
            type: "ARRAY",
            items: {type: "STRING"},
          },
          enfoque: {type: "STRING"},
          preferenciaEdad: {type: "STRING"},
          nivelMalestar: {type: "STRING"},
          urgencia: {type: "STRING"},
          preferenciaGenero: {type: "STRING"},
          modalidad: {type: "STRING"},
          disponibilidad: {
            type: "ARRAY",
            items: {type: "STRING"},
          },
          presupuesto: {type: "STRING"},
          ciudad: {type: "STRING"},
          observaciones: {type: "STRING"},
        },
      },
    },
    required: ["reply", "data"],
  };
}

module.exports = {
  buildProfileChatResponseSchema,
};
