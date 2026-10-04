import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserRoles, normalizeRoles, getLegacyRoleFromRoles, getRoleLabel } from "../../src/utils/roles.js";

test("roles normalize legacy aliases and remove duplicates/unknowns", () => {
  assert.deepEqual(normalizeRoles(["Paciente", "patient", "psicóloga", "psychologist", "psicofound-admin", "unknown"]), ["patient", "psychologist", "admin"]);
  assert.deepEqual(getUserRoles({ roles: ["patient"], rol: "psicologo" }), ["patient", "psychologist"]);
  assert.deepEqual(getUserRoles({ role: "admin" }), ["admin"]);
});

test("empty roles do not silently grant access unless caller opts in", () => {
  assert.deepEqual(getUserRoles({}), []);
  assert.deepEqual(getUserRoles({}, { defaultPatient: true }), ["patient"]);
  assert.equal(getLegacyRoleFromRoles(["patient", "psychologist"]), "psicologo");
  assert.equal(getLegacyRoleFromRoles(["patient", "admin"]), "admin");
  assert.equal(getRoleLabel("psicologo"), "Psicólogo");
});
