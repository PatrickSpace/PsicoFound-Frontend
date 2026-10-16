import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { getTherapiesByPatient, getTherapiesByTherapist } from "@/services/terapiaService";
import { createRequestGate, isActiveTherapy, itemsForContext } from "@/utils/therapyContext";
import { isPermissionDeniedError } from "@/utils/firebaseErrors";

// Loads and forms belong to one identity/mode generation.
export function useTherapyWorkspace(loadItems = async () => []) {
  const auth = useAuthStore();
  const appContext = useAppContextStore();
  const route = useRoute();
  const therapies = ref([]);
  const items = ref([]);
  const loading = ref(false);
  const error = ref("");
  const revision = ref(0);
  const patientFilter = ref("");
  const therapyFilter = ref("");
  const statusFilter = ref("");
  const gate = createRequestGate();
  let mounted = true;
  const professional = computed(() => appContext.activeMode === "psychologist");
  const mode = computed(() => appContext.activeMode);
  const uid = computed(() => auth.currentUser?.uid || "");
  const filteredTherapies = computed(() => therapies.value.filter((therapy) =>
    (!patientFilter.value || therapy.pacienteUid === patientFilter.value) &&
    (!therapyFilter.value || therapy.id === therapyFilter.value)));
  const visibleItems = computed(() => {
    const ids = new Set(filteredTherapies.value.map((therapy) => therapy.id));
    return items.value.filter((item) => ids.has(item.terapiaId) &&
      (!statusFilter.value || item.status === statusFilter.value));
  });
  const activeTherapies = computed(() => filteredTherapies.value.filter(isActiveTherapy));
  const selectionKey = computed(() => `${revision.value}:${patientFilter.value}:${therapyFilter.value}`);

  function readSelection() {
    const correctMode = route.query.contextMode === mode.value;
    patientFilter.value = professional.value && correctMode ? String(route.query.patientUid || "") : "";
    therapyFilter.value = correctMode ? String(route.query.therapyId || "") : "";
    statusFilter.value = "";
  }

  async function refresh() {
    const ticket = gate.next();
    revision.value = ticket;
    const selectedMode = mode.value;
    const selectedUid = uid.value;
    therapies.value = [];
    items.value = [];
    error.value = "";
    loading.value = Boolean(selectedUid);
    if (!selectedUid) return;
    try {
      let loadedTherapies;
      if (selectedMode === "psychologist") {
        const therapist = await getTherapistByUserUid(selectedUid);
        if (!gate.isCurrent(ticket)) return;
        if (!therapist?.id) throw new Error("No se encontró tu vínculo profesional.");
        loadedTherapies = await getTherapiesByTherapist(therapist.id);
      } else if (selectedMode === "patient") {
        loadedTherapies = await getTherapiesByPatient(selectedUid);
      } else {
        throw new Error("Selecciona la vista de paciente o psicólogo.");
      }
      if (!gate.isCurrent(ticket)) return;
      const loadedItems = await loadItems(loadedTherapies, { mode: selectedMode, uid: selectedUid });
      if (!gate.isCurrent(ticket)) return;
      therapies.value = loadedTherapies;
      items.value = itemsForContext(loadedItems, loadedTherapies, selectedMode, selectedUid);
    } catch (cause) {
      if (gate.isCurrent(ticket)) error.value = isPermissionDeniedError(cause)
        ? "Acceso restringido al proceso seleccionado." : "No se pudo cargar el proceso. Actualiza para reintentar.";
    } finally {
      if (gate.isCurrent(ticket)) loading.value = false;
    }
  }

  watch([uid, mode], () => { readSelection(); refresh(); }, { immediate: true, flush: "sync" });
  watch(() => [route.query.patientUid, route.query.therapyId, route.query.contextMode], readSelection);
  onBeforeUnmount(() => { mounted = false; gate.next(); });
  const contextQuery = (therapy) => ({ contextMode: mode.value, patientUid: therapy.pacienteUid, therapyId: therapy.id });
  return {
    therapies, items, loading, error, revision, professional, mode, uid,
    patientFilter, therapyFilter, statusFilter, filteredTherapies, visibleItems,
    activeTherapies, selectionKey, refresh, contextQuery,
    capture: () => selectionKey.value, isCurrent: (ticket) => mounted && ticket === selectionKey.value,
  };
}
