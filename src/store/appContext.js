import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { getUserById } from "@/services/userService";
import { getTherapistByUserUid } from "@/services/psicologoService";

const MODE_STORAGE_KEY = "psicofound-active-mode";

export const useAppContextStore = defineStore("appContext", () => {
  const userProfile = ref(null);
  const therapistProfile = ref(null);
  const loading = ref(false);
  const loadedForUid = ref("");
  const activeMode = ref(readStoredMode());

  const isAdmin = computed(() => {
    const role = normalizeRole(userProfile.value?.rol || userProfile.value?.role);
    return ["admin", "psicofound-admin"].includes(role);
  });

  const hasPatientAccess = computed(() => Boolean(userProfile.value));
  const hasPsychologistAccess = computed(() => Boolean(therapistProfile.value?.id));

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

  async function loadForUser(uid) {
    if (!uid) {
      reset();
      return;
    }

    if (loadedForUid.value === uid && !loading.value) {
      ensureValidMode();
      return;
    }

    loading.value = true;

    try {
      const [user, therapist] = await Promise.all([
        getUserById(uid),
        getTherapistByUserUid(uid),
      ]);

      userProfile.value = user || {
        id: uid,
        rol: "patient",
      };
      therapistProfile.value = therapist;
      loadedForUid.value = uid;
      ensureValidMode();
    } catch (error) {
      console.error("Error loading app context:", error);
      userProfile.value = {
        id: uid,
        rol: "patient",
      };
      therapistProfile.value = null;
      loadedForUid.value = uid;
      ensureValidMode();
    } finally {
      loading.value = false;
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
    userProfile.value = null;
    therapistProfile.value = null;
    loadedForUid.value = "";
    activeMode.value = readStoredMode();
  }

  return {
    userProfile,
    therapistProfile,
    loading,
    activeMode,
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

function normalizeRole(role = "") {
  return role.toString().trim().toLowerCase();
}
