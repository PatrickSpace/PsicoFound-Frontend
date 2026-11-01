import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { APP_ROLES, getUserRoles } from "@/utils/roles";

const MODE_STORAGE_KEY = "psicofound-active-mode";

export const useAppContextStore = defineStore("appContext", () => {
  const userProfile = ref(null);
  const therapistProfile = ref(null);
  const loading = ref(false);
  const loadedForUid = ref("");
  const activeMode = ref(readStoredMode());
  let loadVersion = 0;
  let stopIdentity;
  let stopProfessional;
  let watchingUid = "";
  async function watchIdentity(uid, version) {
    const { watchUserIdentity, watchProfessionalIdentity } = await import("@/services/identityService");
    if (loadedForUid.value !== uid || version !== loadVersion) return;
    stopIdentity?.(); stopProfessional?.(); watchingUid = uid;
    stopIdentity = watchUserIdentity(uid, snapshot => {
      if (watchingUid !== uid || loadedForUid.value !== uid || version !== loadVersion) return;
      userProfile.value = snapshot.exists() ? { ...snapshot.data(), id: uid } : null;
      ensureValidMode();
    }, () => { if (watchingUid === uid && version === loadVersion) { userProfile.value = null; ensureValidMode(); } });
    if (userProfile.value?.accountStatus === "suspended") return;
    stopProfessional = watchProfessionalIdentity(uid, snapshot => {
      if (watchingUid !== uid || loadedForUid.value !== uid || version !== loadVersion) return;
      const item = snapshot.docs[0];
      therapistProfile.value = item ? { ...item.data(), id: item.id } : null;
      ensureValidMode();
    }, () => { if (watchingUid === uid && version === loadVersion) { therapistProfile.value = null; ensureValidMode(); } });
  }

  const userRoles = computed(() =>
    getUserRoles(userProfile.value, { defaultPatient: Boolean(userProfile.value) })
  );

  const isAdmin = computed(() => {
    return userRoles.value.includes(APP_ROLES.ADMIN);
  });

  const hasPatientAccess = computed(() =>
    userRoles.value.includes(APP_ROLES.PATIENT)
  );
  const hasPsychologistAccess = computed(
    () =>
      userRoles.value.includes(APP_ROLES.PSYCHOLOGIST) &&
      Boolean(therapistProfile.value?.id) && therapistProfile.value.activo !== false
  );

  const availableModes = computed(() => {
    const modes = [];

    if (hasPatientAccess.value) {
      modes.push({
        value: "patient",
        label: "Paciente",
        icon: "mdi-account-heart-outline",
      });
    }

    if (hasPsychologistAccess.value) {
      modes.push({
        value: "psychologist",
        label: "Psicólogo",
        icon: "mdi-account-tie-outline",
      });
    }

    if (isAdmin.value) {
      modes.push({
        value: "admin",
        label: "Admin",
        icon: "mdi-shield-account-outline",
      });
    }

    return modes;
  });

  const canSwitchModes = computed(() => availableModes.value.length > 1);

  let pendingLoad;
  let pendingUid = "";
  function loadForUser(uid, options = {}) {
    if (pendingLoad && pendingUid === uid && !options.force) return pendingLoad;
    pendingUid = uid;
    const operation = performLoad(uid, options);
    pendingLoad = operation;
    const clearPending = () => { if (pendingLoad === operation) pendingLoad = null; };
    operation.then(clearPending, clearPending);
    return operation;
  }

  async function performLoad(uid, options = {}) {
    if (!uid) {
      reset();
      return;
    }

    if (loadedForUid.value === uid && !loading.value && !options.force) {
      ensureValidMode();
      return;
    }

    const version = ++loadVersion;
    if (loadedForUid.value !== uid) {
      watchingUid = ""; stopIdentity?.(); stopProfessional?.();
      userProfile.value = null;
      therapistProfile.value = null;
      loadedForUid.value = "";
    }
    loading.value = true;

    try {
      const { getUserById, getTherapistByUserUid } = await import("@/services/identityService");
      const user = await getUserById(uid);
      const therapist = user?.accountStatus === "suspended" ? null : await getTherapistByUserUid(uid);
      if (version !== loadVersion) return;

      userProfile.value = user || {
        id: uid,
        roles: [APP_ROLES.PATIENT],
        rol: APP_ROLES.PATIENT,
      };
      therapistProfile.value = therapist;
      loadedForUid.value = uid;
      await watchIdentity(uid, version);
      ensureValidMode();
    } catch (error) {
      if (version !== loadVersion) return;
      console.error("Error loading app context:", error);
      userProfile.value = {
        id: uid,
        roles: [APP_ROLES.PATIENT],
        rol: APP_ROLES.PATIENT,
      };
      therapistProfile.value = null;
      loadedForUid.value = uid;
      await watchIdentity(uid, version);
      ensureValidMode();
    } finally {
      if (version === loadVersion) loading.value = false;
    }
  }

  function setActiveMode(mode) {
    const nextMode = availableModes.value.some((item) => item.value === mode)
      ? mode
      : availableModes.value[0]?.value || "patient";

    activeMode.value = nextMode;
    localStorage.setItem(MODE_STORAGE_KEY, nextMode);
  }

  function ensureValidMode() {
    const modes = availableModes.value.map((item) => item.value);

    if (modes.includes(activeMode.value)) {
      return;
    }

    setActiveMode(
      hasPsychologistAccess.value && !hasPatientAccess.value
        ? "psychologist"
        : modes[0] || "patient"
    );
  }

  function reset() {
    loadVersion += 1;
    pendingLoad = null; pendingUid = "";
    watchingUid = ""; stopIdentity?.(); stopProfessional?.();
    loading.value = false;
    userProfile.value = null;
    therapistProfile.value = null;
    loadedForUid.value = "";
    activeMode.value = readStoredMode();
  }

  return {
    loadedForUid,
    userProfile,
    therapistProfile,
    loading,
    activeMode,
    userRoles,
    availableModes,
    canSwitchModes,
    hasPatientAccess,
    hasPsychologistAccess,
    isAdmin,
    loadForUser,
    setActiveMode,
    reset,
  };
});

function readStoredMode() {
  return localStorage.getItem(MODE_STORAGE_KEY) || "patient";
}
