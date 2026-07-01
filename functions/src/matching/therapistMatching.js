const {normalizeKey} = require("./criteria");

function findMatchingTherapists(allTherapists = [], criteria = {}) {
  const reqEspecialidades = normalizeStringArray(criteria.especialidades);
  const reqEnfoque = normalizeKey(criteria.enfoque);
  const reqGenero = normalizeKey(criteria.genero);
  const reqModalidad = normalizeModality(criteria.modalidad);
  const {minEdad, maxEdad} = parseAgeRange(criteria.edad);

  if (!Array.isArray(allTherapists) || allTherapists.length === 0) {
    return [];
  }

  return allTherapists
      .map((therapist) => {
        const score = scoreTherapist(therapist, {
          reqEspecialidades,
          reqEnfoque,
          reqGenero,
          reqModalidad,
          minEdad,
          maxEdad,
        });

        return {therapist, score};
      })
      .filter(({score}) => {
        const anyCriterion =
          reqEspecialidades.length > 0 ||
          Boolean(reqEnfoque) ||
          Boolean(reqGenero) ||
          Boolean(reqModalidad) ||
          minEdad > 0 ||
          maxEdad > 0;

        return anyCriterion ? score > 0 : true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((result) => result.therapist);
}

function scoreTherapist(therapist, request) {
  let score = 0;

  const therapistEspecialidades = normalizeStringArray(
      therapist.especialidades,
  );
  if (request.reqEspecialidades.length > 0) {
    const matches = request.reqEspecialidades.filter((item) =>
      therapistEspecialidades.includes(item),
    );
    score += matches.length;
  }

  const therapistEnfoques = normalizeStringArray(
      therapist.enfoques || therapist.enfoque,
  );
  if (request.reqEnfoque && therapistEnfoques.includes(request.reqEnfoque)) {
    score += 2;
  }

  const therapistGenero = normalizeKey(therapist.genero);
  if (request.reqGenero && therapistGenero === request.reqGenero) {
    score += 1;
  }

  const therapistModalidades = normalizeStringArray(
      therapist.modalidades || therapist.modalidad,
  ).map(normalizeModality);
  if (
    request.reqModalidad &&
    therapistModalidades.includes(request.reqModalidad)
  ) {
    score += 1;
  }

  const therapistEdad = Number(therapist.edad) || 0;
  if (request.minEdad > 0 || request.maxEdad > 0) {
    const minOk = request.minEdad > 0 ? therapistEdad >= request.minEdad : true;
    const maxOk = request.maxEdad > 0 ? therapistEdad <= request.maxEdad : true;

    if (minOk && maxOk) {
      score += 1;
    }
  }

  return score;
}

function parseAgeRange(value) {
  const normalized = (value || "").toString().trim();

  if (normalized === "25-35") {
    return {minEdad: 25, maxEdad: 35};
  }

  if (normalized === "35-45") {
    return {minEdad: 35, maxEdad: 45};
  }

  if (normalized === "+ 45" || normalized === "+45" || normalized === "45+") {
    return {minEdad: 45, maxEdad: 0};
  }

  return {minEdad: 0, maxEdad: 0};
}

function normalizeModality(value) {
  const normalized = normalizeKey(value);

  if (!normalized || normalized === "me es indiferente") {
    return "";
  }

  if (
    normalized === "online" ||
    normalized === "remota" ||
    normalized === "remoto" ||
    normalized === "virtual"
  ) {
    return "remoto";
  }

  if (normalized === "presencial" || normalized === "precencial") {
    return "presencial";
  }

  if (
    normalized === "hibrida" ||
    normalized === "hiibrido" ||
    normalized === "hibrido"
  ) {
    return "hibrido";
  }

  return normalized;
}

function normalizeStringArray(value) {
  const values = Array.isArray(value) ? value : [value];

  return values
      .map((item) => normalizeKey(item))
      .filter(Boolean);
}

module.exports = {
  findMatchingTherapists,
};
