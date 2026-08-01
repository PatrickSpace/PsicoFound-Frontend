import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { getUserById } from "@/services/userService";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { APP_ROLES, getUserRoles } from "@/utils/roles";

const MODE_STORAGE_KEY = "psicofound-active-mode";

export const useAppContextStore = defineStore("appContext", () => {
  const userProfile = ref(null);
  const therapistProfile = ref(null);
  const loading = ref(false);
  const loadedForUid = ref("");
  const activeMode = ref(readStoredMode());
  let loadPromise = null;
  let loadingUid = "";
  let loadSequence = 0;

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
      Boolean(therapistProfile.value?.id)
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

  async function loadForUser(uid, options = {}) {
    if (!uid) {
      reset();
      return;
    }

    if (loadedForUid.value === uid && !loading.value && !options.force) {
      ensureValidMode();
      return userProfile.value;
    }

    if (loadPromise && loadingUid === uid && !options.force) {
      return loadPromise;
    }

    loading.value = true;
    loadingUid = uid;
    const requestId = ++loadSequence;
    const currentPromise = Promise.all([
      getUserById(uid, { force: options.force }),
      getTherapistByUserUid(uid, { force: options.force }),
    ])
      .then(([user, therapist]) => {
        if (requestId !== loadSequence) {
          return userProfile.value;
        }

        userProfile.value = user || {
          id: uid,
          roles: [APP_ROLES.PATIENT],
          rol: APP_ROLES.PATIENT,
        };
        therapistProfile.value = therapist;
        loadedForUid.value = uid;
        ensureValidMode();
        return userProfile.value;
      })
      .catch((error) => {
        if (requestId !== loadSequence) {
          return userProfile.value;
        }

        console.error("Error loading app context:", error);
        userProfile.value = {
          id: uid,
          roles: [APP_ROLES.PATIENT],
          rol: APP_ROLES.PATIENT,
        };
        therapistProfile.value = null;
        loadedForUid.value = uid;
        ensureValidMode();
        return userProfile.value;
      })
      .finally(() => {
        if (loadPromise === currentPromise) {
          loadPromise = null;
          loadingUid = "";
          loading.value = false;
        }
      });

    loadPromise = currentPromise;
    return currentPromise;
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
    userProfile.value = null;
    therapistProfile.value = null;
    loadedForUid.value = "";
    loadPromise = null;
    loadingUid = "";
    loadSequence += 1;
    loading.value = false;
    activeMode.value = readStoredMode();
  }

  return {
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
