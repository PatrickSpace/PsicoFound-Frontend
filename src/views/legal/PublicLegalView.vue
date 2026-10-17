<template>
  <main class="legal-page brand-system-scope">
    <header><MainLogo /><router-link to="/registro">Volver al registro</router-link></header>
    <article aria-labelledby="legal-title">
      <p>Documentos de Lurems</p>
      <h1 id="legal-title">{{ title }}</h1>
      <p v-if="loading" role="status">Cargando documento…</p>
      <v-alert v-else-if="error" type="error" variant="tonal">{{ error }}</v-alert>
      <template v-else>
        <p class="legal-meta">Versión {{ version }} <span v-if="publishedAt">· Publicada el {{ publishedAt }}</span></p>
        <aside v-if="version !== legalConfig.version" class="legal-notice">
          Versión histórica. <router-link :to="route.path">Consultar versión vigente</router-link>.
        </aside>
        <div class="legal-text">{{ text }}</div>
      </template>
      <footer>
        <router-link :to="kind === 'terms' ? '/privacidad' : '/terminos'">{{ kind === 'terms' ? 'Política de privacidad' : 'Términos de uso' }}</router-link>
        <router-link to="/">Ir al inicio de Lurems</router-link>
      </footer>
    </article>
  </main>
</template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import MainLogo from "@/components/Common/MainLogo.vue";
import { legalConfig } from "@/config/legal";
const route = useRoute();
const kind = computed(() => route.meta.legalKind);
const title = computed(() => kind.value === "terms" ? "Términos de uso" : "Política de privacidad");
const loading = ref(true), error = ref(""), text = ref(""), version = ref(""), publishedAt = ref("");
let generation = 0;
watch(() => [kind.value, route.query.version, legalConfig.version, legalConfig.managed, legalConfig.loading, legalConfig.error], async () => {
  const token = ++generation;
  loading.value = true; error.value = ""; text.value = ""; publishedAt.value = "";
  const explicitVersion = route.query.version;
  if (!explicitVersion && legalConfig.loading) return;
  const selected = explicitVersion || (legalConfig.managed ? legalConfig.version : "");
  if (!selected) {
    loading.value = false;
    if (legalConfig.error) { error.value = legalConfig.error; return; }
    error.value = "Los documentos legales todavía no están disponibles. Intenta nuevamente más tarde.";
    return;
  }
  if (typeof selected !== "string" || !/^[A-Za-z0-9_.-]{1,80}$/.test(selected)) {
    loading.value = false; error.value = "La versión solicitada no es válida."; return;
  }
  try {
    const snapshot = await getDoc(doc(db, "legal_releases", selected));
    if (token !== generation) return;
    if (!snapshot.exists()) throw new Error("not-found");
    const value = snapshot.data();
    text.value = kind.value === "terms" ? value.termsText : value.privacyText;
    version.value = value.version;
    publishedAt.value = value.publishedAt?.toDate?.().toLocaleDateString("es-PE", {timeZone:"America/Lima"}) || "";
  } catch {
    if (token === generation) error.value = "No pudimos cargar esta versión del documento. Comprueba el enlace o intenta nuevamente.";
  } finally { if (token === generation) loading.value = false; }
}, {immediate:true});
onBeforeUnmount(() => generation++);
</script>
<style scoped>
.legal-page { min-height: 100dvh; padding: 24px clamp(16px, 4vw, 48px) 64px; background: #fafaf7; color: #24352d; }
header { max-width: 900px; margin: 0 auto 40px; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
header :deep(img) { max-width: 180px; }
article { max-width: 800px; margin: auto; overflow-wrap: anywhere; }
h1 { font-size: clamp(2rem, 6vw, 3rem); line-height: 1.15; margin: 16px 0; }
p { line-height: 1.8; }
a { color: #315c47; text-underline-offset: 3px; }
a:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
.legal-meta { margin: 16px 0; }
.legal-notice { background: #fff4d8; border-left: 4px solid #987020; padding: 20px; margin: 28px 0; border-radius: 8px; }
.legal-text { white-space: pre-wrap; line-height: 1.85; margin-top: 28px; }
footer { border-top: 1px solid #cbd5c9; padding-top: 28px; margin-top: 40px; display:flex; flex-wrap:wrap; gap:24px; }
</style>
