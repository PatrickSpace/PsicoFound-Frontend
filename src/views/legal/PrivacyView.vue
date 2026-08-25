<template>
  <v-main class="legal-page">
    <v-container class="legal-page__content py-10 py-md-16">
      <v-btn to="/registro" variant="text" prepend-icon="mdi-arrow-left" class="pf-btn-ghost mb-6">
        Volver al registro
      </v-btn>
      <p class="text-overline text-secondary mb-2">Información legal</p>
      <h1 class="text-h3 font-weight-bold mb-3">Política de privacidad</h1>
      <p class="text-body-2 text-medium-emphasis mb-8">Versión 24 de agosto de 2026</p>

      <section v-for="section in sections" :key="section.title" class="legal-section mb-7">
        <h2 class="text-h5 font-weight-bold mb-2">{{ section.title }}</h2>
        <p class="text-body-1 text-medium-emphasis">{{ section.body }}</p>
      </section>
    </v-container>
  </v-main>
</template>

<script setup>
const sections = [
  {
    title: "Información tratada",
    body: "Lurems procesa datos de cuenta, preferencias de búsqueda, reservas, pagos y seguimiento terapéutico necesarios para prestar el servicio.",
  },
  {
    title: "Separación de datos",
    body: "La información clínica se mantiene separada de los datos financieros. Mercado Pago recibe descripciones neutrales y los datos estrictamente necesarios para procesar una operación.",
  },
  {
    title: "Inteligencia artificial",
    body: "La encuesta conversacional utiliza inteligencia artificial para organizar preferencias y orientar recomendaciones. No realiza diagnósticos ni sustituye a un profesional.",
  },
  {
    title: "Acceso y seguridad",
    body: "El acceso se limita según los roles de paciente, psicólogo y administrador. Los secretos, tokens de pago y datos de tarjetas no se almacenan en el navegador ni en documentos accesibles por clientes.",
  },
  {
    title: "Conservación y derechos",
    body: "Antes del lanzamiento público deben definirse los plazos de conservación, el canal institucional para solicitudes de acceso o eliminación y la revisión legal correspondiente.",
  },
];
</script>

<style scoped>
.legal-page {
  min-height: 100dvh;
  background: rgb(var(--v-theme-background));
}
.legal-page__content { max-width: 880px; }
.legal-section { max-width: 760px; }
</style>
