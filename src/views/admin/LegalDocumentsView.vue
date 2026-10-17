<template>
  <LayoutDefault layout>
    <v-container v-if="workspace.active.value" class="pa-0 legal-admin">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">Administración</p>
            <h1 class="text-h4 font-weight-bold">Documentos legales</h1>
            <p class="text-body-1 text-medium-emphasis mt-2">Administra los términos de uso y la política de privacidad.</p>
          </div>
          <v-btn color="secondary" class="pf-btn-primary" prepend-icon="mdi-plus" :disabled="busy" @click="newDraft()">Nuevo borrador</v-btn>
        </div>
        <v-divider class="page-header-divider" />
      </div>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <v-alert v-if="success" type="success" variant="tonal" class="mb-4">{{ success }}</v-alert>
      <v-btn variant="text" :disabled="busy" @click="workspace.reload">Actualizar</v-btn>
      <v-card class="pa-5 mb-6" variant="outlined">
        <h2 class="text-h6">Versión vigente</h2>
        <p class="my-3">{{ legalConfig.loading ? 'Consultando…' : legalConfig.version || 'Todavía no hay documentos publicados' }}</p>
        <p v-if="legalConfig.error" role="alert">{{ legalConfig.error }}</p>
        <div v-if="legalConfig.version" class="d-flex flex-wrap ga-3">
          <v-btn :href="legalConfig.termsUrl" target="_blank" rel="noopener noreferrer" variant="text">Ver términos</v-btn>
          <v-btn :href="legalConfig.privacyUrl" target="_blank" rel="noopener noreferrer" variant="text">Ver privacidad</v-btn>
        </div>
        <p class="text-body-2 mt-3">Ambos documentos se publican juntos, con vigencia inmediata. Las cuentas deberán aceptar la nueva versión para continuar con las funciones que requieren consentimiento vigente.</p>
      </v-card>
      <v-row>
        <v-col cols="12" md="4">
          <h2 class="text-h6 mb-3">Borradores</h2>
          <p v-if="loading" role="status">Cargando documentos…</p>
          <p v-else-if="!drafts.length" class="text-body-2 mb-4">Crea un borrador para preparar la primera publicación.</p>
          <v-card v-for="draft in sortedDrafts" :key="draft.id" variant="outlined" class="pa-4 mb-3">
            <p class="font-weight-bold legal-version">{{ draft.version }}</p>
            <p class="text-caption my-2">{{ draft.publishedVersion ? 'Publicado · solo lectura' : `Borrador · revisión ${draft.revision}` }}</p>
            <v-btn size="small" variant="text" :disabled="busy" @click="selectDraft(draft)">{{ draft.publishedVersion ? 'Consultar' : 'Editar borrador' }}</v-btn>
          </v-card>
          <h2 class="text-h6 mt-6 mb-3">Historial publicado</h2>
          <p v-if="!releases.length" class="text-body-2">Sin versiones publicadas.</p>
          <v-card v-for="release in sortedReleases" :key="release.id" class="pa-4 mb-3" variant="outlined">
            <p class="font-weight-bold legal-version">{{ release.version }}</p>
            <p class="text-caption my-2">{{ adminDate(release.publishedAt) }}</p>
            <div class="d-flex flex-wrap ga-1">
              <v-btn :to="`/terminos?version=${encodeURIComponent(release.version)}`" target="_blank" size="small" variant="text">Términos</v-btn>
              <v-btn :to="`/privacidad?version=${encodeURIComponent(release.version)}`" target="_blank" size="small" variant="text">Privacidad</v-btn>
              <v-btn size="small" variant="text" :disabled="busy" @click="newDraft(release)">Crear nueva versión</v-btn>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card v-if="form.id" class="pa-5" variant="outlined">
            <h2 class="text-h6 mb-3">{{ sealed ? 'Versión publicada' : 'Editar borrador' }}</h2>
            <v-alert v-if="sealed" type="info" variant="tonal" class="mb-4">El contenido publicado se conserva. Crea otra versión para modificarlo.</v-alert>
            <v-text-field v-model="form.version" label="Identificador de versión" placeholder="2026-10-v1" maxlength="80" counter
              hint="Identificador único: letras, números, puntos, guiones y guiones bajos." persistent-hint :disabled="busy" :readonly="sealed" variant="outlined" class="mb-4" />
            <v-tabs v-model="editorTab" color="secondary">
              <v-tab value="terms">Términos de uso</v-tab>
              <v-tab value="privacy">Privacidad</v-tab>
              <v-tab value="preview">Vista previa</v-tab>
            </v-tabs>
            <v-textarea v-if="editorTab === 'terms'" v-model="form.termsText" label="Contenido de términos de uso" rows="18" counter="100000" maxlength="100000" :disabled="busy" :readonly="sealed" variant="outlined" class="mt-4" />
            <v-textarea v-if="editorTab === 'privacy'" v-model="form.privacyText" label="Contenido de política de privacidad" rows="18" counter="100000" maxlength="100000" :disabled="busy" :readonly="sealed" variant="outlined" class="mt-4" />
            <div v-if="editorTab === 'preview'" class="mt-5">
              <h3 class="text-h6">Términos de uso</h3><div class="legal-preview my-4">{{ form.termsText || 'Sin contenido' }}</div>
              <v-divider class="my-5" /><h3 class="text-h6">Política de privacidad</h3><div class="legal-preview my-4">{{ form.privacyText || 'Sin contenido' }}</div>
            </div>
            <p class="text-caption text-medium-emphasis mb-4">El contenido se presenta como texto; conserva los saltos de línea. No se ejecutan etiquetas HTML.</p>
            <div class="d-flex flex-wrap ga-3">
              <v-btn v-if="!sealed" color="secondary" class="pf-btn-primary" :loading="saving" :disabled="busy || !validDraft || !dirty" @click="save">Guardar borrador</v-btn>
              <v-btn v-if="!sealed" color="secondary" variant="outlined" :disabled="busy || !valid || dirty || !form.revision || legalConfig.loading || Boolean(legalConfig.error)" @click="openPublish">Publicar versión</v-btn>
              <v-btn v-if="sealed" variant="outlined" :disabled="busy" @click="newDraft(form)">Crear nueva versión</v-btn>
            </div>
            <p v-if="dirty" class="text-caption mt-3">Hay cambios sin guardar. Guarda el borrador antes de publicarlo.</p>
          </v-card>
          <v-empty-state v-else icon="mdi-file-document-edit-outline" headline="Prepara tus documentos" text="Selecciona un borrador o crea una nueva versión para editar los documentos." />
        </v-col>
      </v-row>
      <v-dialog v-model="publishDialog" max-width="580" :persistent="publishing">
        <v-card title="Publicar documentos legales">
          <v-card-text>
            <p class="mb-4">Se publicarán los términos y la política de privacidad de la versión <strong>{{ form.version }}</strong>. Estarán disponibles al público inmediatamente y se solicitará su aceptación para las funciones que la requieren.</p>
            <p class="mb-4">La versión publicada no podrá editarse. Revisa los datos del titular, los canales de contacto y las condiciones antes de continuar.</p>
            <v-text-field v-model="approvalReference" label="Referencia de revisión o aprobación" hint="Indica el acta, expediente o responsable y fecha de revisión." persistent-hint maxlength="500" variant="outlined" :disabled="publishing" />
            <v-checkbox v-model="confirmReviewed" label="He revisado ambos documentos y confirmo que están completos y listos para publicarse." :disabled="publishing" />
            <v-alert v-if="publishError" type="error" variant="tonal">{{ publishError }}</v-alert>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-btn :disabled="publishing" @click="publishDialog = false">Cancelar</v-btn>
            <v-btn color="secondary" :loading="publishing" :disabled="!confirmReviewed || !approvalReference.trim() || publishing" @click="publish">Confirmar publicación</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="discardDialog" max-width="480">
        <v-card title="Cambios sin guardar">
          <v-card-text>Se perderán las modificaciones que todavía no hayas guardado.</v-card-text>
          <v-card-actions><v-btn @click="discardDialog = false">Seguir editando</v-btn><v-btn color="secondary" @click="discard">Descartar cambios</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>
<script setup>
import { computed, reactive, ref } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, watchAdminCollection } from "@/services/adminService";
import { legalConfig } from "@/config/legal";
import { initialTermsText } from "@/config/legalDraft";
const drafts = ref([]), releases = ref([]), loading = ref(true), error = ref(""), success = ref("");
const saving = ref(false), publishing = ref(false), publishDialog = ref(false), discardDialog = ref(false);
const approvalReference = ref(""), confirmReviewed = ref(false), publishError = ref(""), editorTab = ref("terms");
const form = reactive({id:"", version:"", termsText:"", privacyText:"", revision:0, publishedVersion:""});
const original = ref("");
let pendingSelection;
let publishingExpectedVersion = "";
const serialize = () => JSON.stringify([form.version, form.termsText, form.privacyText]);
const dirty = computed(() => Boolean(form.id) && serialize() !== original.value);
const sealed = computed(() => Boolean(form.publishedVersion));
const busy = computed(() => saving.value || publishing.value);
const validDraft = computed(() => /^[A-Za-z0-9_.-]{1,80}$/.test(form.version) && form.version !== "current" && form.termsText.length <= 100000 && form.privacyText.length <= 100000);
const valid = computed(() => validDraft.value && Boolean(form.termsText.trim()) && Boolean(form.privacyText.trim()));
const sortedDrafts = computed(() => [...drafts.value].sort((a,b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
const sortedReleases = computed(() => [...releases.value].sort((a,b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0)));
const workspace = useAdminWorkspace(() => {
  drafts.value = []; releases.value = []; loading.value = true; error.value = ""; success.value = "";
  Object.assign(form, {id:"",version:"",termsText:"",privacyText:"",revision:0,publishedVersion:""});
  original.value = ""; saving.value = false; publishing.value = false; publishDialog.value = false; discardDialog.value = false;
  approvalReference.value = ""; confirmReviewed.value = false; publishError.value = ""; pendingSelection = null;
}, current => {
  const onError = () => { if(current()) { error.value = "No pudimos cargar los documentos. Actualiza para reintentar."; loading.value = false; } };
  const stopDrafts = watchAdminCollection("legal_drafts", values => { if(current()) { drafts.value = values; loading.value = false; } }, onError);
  const stopReleases = watchAdminCollection("legal_releases", values => { if(current()) releases.value = values; }, onError);
  return () => { stopDrafts(); stopReleases(); };
});
function changeSelection(value) {
  if (dirty.value && !sealed.value) { pendingSelection = value; discardDialog.value = true; return; }
  applySelection(value);
}
function applySelection(value) { Object.assign(form, value); original.value = value.revision ? serialize() : ""; editorTab.value = "terms"; error.value = ""; success.value = ""; }
function discard() { discardDialog.value = false; if(pendingSelection) applySelection(pendingSelection); pendingSelection = null; }
function newDraft(source) {
  changeSelection({id:crypto.randomUUID(), version:"", termsText:source?.termsText || initialTermsText, privacyText:source?.privacyText || "", revision:0,publishedVersion:""});
}
function selectDraft(draft) { changeSelection({...draft, publishedVersion:draft.publishedVersion || ""}); }
async function save() {
  if (!validDraft.value || busy.value || sealed.value) return;
  const current = workspace.capture(); saving.value = true; error.value = ""; success.value = "";
  const data = {id:form.id, version:form.version, termsText:form.termsText, privacyText:form.privacyText, expectedRevision:form.revision};
  try {
    const result = await adminCall("saveLegalDraft", data);
    if (!current()) return;
    form.revision = result.revision; original.value = serialize(); success.value = "Borrador guardado. Todavía no es público.";
  } catch (e) { if(current()) error.value = e.message || "No pudimos guardar el borrador."; }
  finally { if(current()) saving.value = false; }
}
function openPublish() {
  if (dirty.value || !valid.value || sealed.value || !form.revision) return;
  publishingExpectedVersion = legalConfig.version;
  approvalReference.value = ""; confirmReviewed.value = false; publishError.value = ""; publishDialog.value = true;
}
async function publish() {
  if (!confirmReviewed.value || !approvalReference.value.trim() || busy.value) return;
  const current = workspace.capture(); publishing.value = true; publishError.value = "";
  try {
    const result = await adminCall("publishLegalDraft", {id:form.id, expectedRevision:form.revision, expectedCurrentVersion:publishingExpectedVersion, confirmReviewed:true, approvalReference:approvalReference.value});
    if (!current()) return;
    form.publishedVersion = result.version; publishDialog.value = false; success.value = `Versión ${result.version} publicada. Las versiones anteriores se conservan.`;
  } catch (e) { if(current()) publishError.value = e.message || "No pudimos publicar la versión."; }
  finally { if(current()) publishing.value = false; }
}
</script>
<style scoped>
.legal-admin { max-width: 1440px; }
.legal-version { overflow-wrap:anywhere; }
.legal-preview { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8; }
</style>
