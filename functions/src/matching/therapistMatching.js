const {normalizeKey} = require("./criteria");
const {normalizeModality, modalityMatches} = require("./modality");

function findMatchingTherapists(
    allTherapists = [],
    criteria = {},
    requiredCriteria = [],
    limit = 5,
) {
  const reqEspecialidades = normalizeStringArray(criteria.especialidades);
  const reqEnfoque = normalizeKey(criteria.enfoque);
  const reqGenero = normalizeKey(criteria.genero);
  const reqModalidad = normalizeModality(criteria.modalidad);
  const {minEdad, maxEdad} = parseAgeRange(criteria.edad);
  const request = {
    reqEspecialidades,
    reqEnfoque,
    reqGenero,
    reqModalidad,
    minEdad,
    maxEdad,
  };

  if (!Array.isArray(allTherapists) || allTherapists.length === 0) {
    return [];
  }

  return allTherapists
      .map((therapist) => {
        const score = scoreTherapist(therapist, request);

        return {therapist, score};
      })
      .filter(({therapist, score}) => {
        const anyCriterion =
          reqEspecialidades.length > 0 ||
          Boolean(reqEnfoque) ||
          Boolean(reqGenero) ||
          Boolean(reqModalidad) ||
          minEdad > 0 ||
          maxEdad > 0;

        return matchesRequiredCriteria(
            therapist,
            request,
            requiredCriteria,
        ) && (anyCriterion ? score >= 0 : true);
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((result) => result.therapist);
}

function matchesRequiredCriteria(therapist, request, requiredCriteria = []) {
  const required = new Set(requiredCriteria);
  const matches = getCriterionMatches(therapist, request);
  return [...required].every((key) => matches[key] !== false);
}

function getMatchDetails(therapist, criteria = {}) {
  const {minEdad, maxEdad} = parseAgeRange(criteria.edad);
  const request = {
    reqEspecialidades: normalizeStringArray(criteria.especialidades),
    reqEnfoque: normalizeKey(criteria.enfoque),
    reqGenero: normalizeKey(criteria.genero),
    reqModalidad: normalizeModality(criteria.modalidad),
    minEdad,
    maxEdad,
  };
  const matches = getCriterionMatches(therapist, request);
  return Object.entries(matches).reduce((details, [key, value]) => {
    if (value === true) details.matches.push(key);
    if (value === false) details.differs.push(key);
    return details;
  }, {matches: [], differs: []});
}

function getCriterionMatches(therapist, request) {
  const specialties = normalizeStringArray(therapist.especialidades);
  const approaches = normalizeStringArray(
      therapist.enfoques || therapist.enfoque,
  );
  const modalities = normalizeStringArray(
      therapist.modalidades || therapist.modalidad,
  ).map(normalizeModality);
  const therapistAge = Number(therapist.edad) || 0;
  const ageRequested = request.minEdad > 0 || request.maxEdad > 0;
  const ageMatches = !ageRequested ? null :
    (request.minEdad <= 0 || therapistAge >= request.minEdad) &&
    (request.maxEdad <= 0 || therapistAge <= request.maxEdad);
  return {
    especialidades: request.reqEspecialidades.length ?
      request.reqEspecialidades.some((item) => specialties.includes(item)) :
      null,
    enfoque: request.reqEnfoque ?
      approaches.includes(request.reqEnfoque) : null,
    genero: request.reqGenero ?
      normalizeKey(therapist.genero) === request.reqGenero : null,
    modalidad: request.reqModalidad ?
      modalityMatches(modalities, request.reqModalidad) : null,
    edad: ageMatches,
  };
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
    modalityMatches(therapistModalidades, request.reqModalidad)
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

  if (normalized === "18-25") {
    return {minEdad: 18, maxEdad: 25};
  }

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

function normalizeStringArray(value) {
  const values = Array.isArray(value) ? value : [value];

  return values
      .map((item) => normalizeKey(item))
      .filter(Boolean);
}

module.exports = {
  findMatchingTherapists,
  getMatchDetails,
};
