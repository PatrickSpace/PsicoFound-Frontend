<template>
  <section v-for="name in names.filter(name => adminCollectionPages[name])" :key="name" class="my-4" :aria-label="labels[name] || name">
    <p class="text-caption">{{ labels[name] || name }} · Página {{ adminCollectionPages[name].page }} · {{ adminCollectionPages[name].count }} registros. {{ localFilters ? 'Los filtros y la búsqueda se aplican a esta página.' : 'Los filtros consultan toda la bandeja.' }}</p>
    <v-btn variant="text" :disabled="adminCollectionPages[name].loading || adminCollectionPages[name].page === 1" @click="adminCollectionPages[name].previous">Anterior</v-btn>
    <v-btn variant="text" :disabled="adminCollectionPages[name].loading || !adminCollectionPages[name].hasNext" @click="adminCollectionPages[name].next">Siguiente</v-btn>
    <p v-if="adminCollectionPages[name].error" role="alert">{{ adminCollectionPages[name].error }}</p>
  </section>
</template>
<script setup>
import { adminCollectionPages } from "@/services/adminCollectionPages";
defineProps({names: {type:Array, required:true}, localFilters: {type:Boolean, default:true}});
const labels = {admin_tasks:"Tareas de operación", users:"Usuarios", admin_audit:"Cambios del usuario", payment_operations:"Pagos", professional_obligations:"Obligaciones", professional_transfers:"Transferencias", payment_audit:"Decisiones", support_requests:"Soporte", payment_rates:"Tarifas", psychologist_requests:"Solicitudes profesionales", operational_alerts:"Alertas", legal_drafts:"Borradores", legal_releases:"Versiones publicadas"};
</script>
