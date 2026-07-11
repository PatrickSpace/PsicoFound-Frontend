export const APP_ROLES = {
  PATIENT: "patient",
  PSYCHOLOGIST: "psychologist",
  ADMIN: "admin",
};

export const ROLE_OPTIONS = [
  {
    value: APP_ROLES.PATIENT,
    label: "Paciente",
    description: "Puede usar el flujo de búsqueda, citas y seguimiento personal.",
  },
  {
    value: APP_ROLES.PSYCHOLOGIST,
    label: "Psicólogo",
    description: "Puede acceder a agenda, pacientes y seguimiento profesional.",
  },
  {
    value: APP_ROLES.ADMIN,
    label: "Admin",
    description: "Puede revisar solicitudes, usuarios y permisos.",
  },
];

const LEGACY_ROLE_MAP = {
  paciente: APP_ROLES.PATIENT,
  patient: APP_ROLES.PATIENT,
  psicologo: APP_ROLES.PSYCHOLOGIST,
  psicólogo: APP_ROLES.PSYCHOLOGIST,
  psicóloga: APP_ROLES.PSYCHOLOGIST,
  psychologist: APP_ROLES.PSYCHOLOGIST,
  admin: APP_ROLES.ADMIN,
  "psicofound-admin": APP_ROLES.ADMIN,
};

export function normalizeRole(role = "") {
  const normalized = role.toString().trim().toLowerCase();
  return LEGACY_ROLE_MAP[normalized] || normalized;
}

export function normalizeRoles(roles = []) {
  return Array.from(
    new Set(
      roles
        .map(normalizeRole)
        .filter((role) => Object.values(APP_ROLES).includes(role))
    )
  );
}

export function getUserRoles(user = {}, options = {}) {
  const roles = [];

  if (Array.isArray(user.roles)) {
    roles.push(...user.roles);
  }

  if (user.rol || user.role) {
    roles.push(user.rol || user.role);
  }

  const normalizedRoles = normalizeRoles(roles);

  if (options.defaultPatient && normalizedRoles.length === 0) {
    normalizedRoles.unshift(APP_ROLES.PATIENT);
  }

  return normalizedRoles;
}

export function hasRole(user = {}, role) {
  return getUserRoles(user).includes(normalizeRole(role));
}

export function getLegacyRoleFromRoles(roles = []) {
  const normalizedRoles = normalizeRoles(roles);

  if (normalizedRoles.includes(APP_ROLES.ADMIN)) {
    return APP_ROLES.ADMIN;
  }

  if (normalizedRoles.includes(APP_ROLES.PSYCHOLOGIST)) {
    return "psicologo";
  }

  return APP_ROLES.PATIENT;
}

export function getRoleLabel(role = "") {
  const normalizedRole = normalizeRole(role);
  return (
    ROLE_OPTIONS.find((option) => option.value === normalizedRole)?.label ||
    normalizedRole
  );
}
