<template>
  <v-main class="legal-page">
    <v-container class="legal-page__content py-10 py-md-16">
      <v-btn to="/registro" variant="text" prepend-icon="mdi-arrow-left" class="pf-btn-ghost mb-6">
        Volver al registro
      </v-btn>
      <p class="text-overline text-secondary mb-2">Información legal</p>
      <h1 class="text-h3 font-weight-bold mb-3">Términos de uso</h1>
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
    title: "Alcance del servicio",
    body: "Lurems facilita la búsqueda de profesionales, la reserva de sesiones y el seguimiento del proceso terapéutico. No reemplaza la atención profesional ni constituye un servicio de emergencias.",
  },
  {
    title: "Cuentas y responsabilidades",
    body: "Cada persona es responsable de mantener segura su cuenta y de proporcionar información correcta. Los perfiles profesionales requieren revisión antes de atender pacientes.",
  },
  {
    title: "Reservas y pagos",
    body: "Las citas se confirman únicamente cuando el backend valida el pago. La disponibilidad puede bloquearse temporalmente mientras se procesa una operación.",
  },
  {
    title: "Cancelaciones",
    body: "Las cancelaciones realizadas con más de 24 horas de anticipación pueden recibir reembolso completo. Las solicitudes posteriores se evalúan según la causa y el estado confirmado por el proveedor de pagos.",
  },
  {
    title: "Uso adecuado",
    body: "No está permitido suplantar identidades, alterar importes o estados, interferir con la disponibilidad ni utilizar la plataforma de forma abusiva o automatizada.",
  },
  {
    title: "Contacto",
    body: "Antes del lanzamiento público debe configurarse un correo institucional de soporte y completarse la revisión legal aplicable a la operación de Lurems.",
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
