import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
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
  let loadVersion = 0;
  let stopIdentity;
  let stopProfessional;
  let watchingUid = "";
  function watchIdentity(uid) {
    stopIdentity?.(); stopProfessional?.(); watchingUid = uid;
    stopIdentity = onSnapshot(doc(db, "users", uid), snapshot => {
      if (watchingUid !== uid || loadedForUid.value !== uid) return;
      userProfile.value = snapshot.exists() ? { ...snapshot.data(), id: uid } : null;
      ensureValidMode();
    }, () => { if (watchingUid === uid) { userProfile.value = null; ensureValidMode(); } });
    if (userProfile.value?.accountStatus === "suspended") return;
    stopProfessional = onSnapshot(query(collection(db, "therapists"), where("uid", "==", uid)), snapshot => {
      if (watchingUid !== uid || loadedForUid.value !== uid) return;
      const item = snapshot.docs[0];
      therapistProfile.value = item ? { ...item.data(), id: item.id } : null;
      ensureValidMode();
    }, () => { if (watchingUid === uid) { therapistProfile.value = null; ensureValidMode(); } });
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

  async function loadForUser(uid, options = {}) {
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
      userProfile.value = null;
      therapistProfile.value = null;
      loadedForUid.value = "";
    }
    loading.value = true;

    try {
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
      watchIdentity(uid);
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
      watchIdentity(uid);
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
