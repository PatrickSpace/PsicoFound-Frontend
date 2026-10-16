<template><LayoutDefault layout><v-container v-if="workspace.active.value" class="pa-0">
  <div class="page-header"><h1 class="text-h4 font-weight-bold">Solicitudes de psicólogos</h1><p>Revisa la información declarada antes de habilitar el acceso. Esta decisión no certifica acreditaciones externas.</p></div>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert><v-btn class="mb-4" :loading="loading" @click="workspace.reload">Actualizar</v-btn>
  <v-text-field v-model="search" clearable label="Buscar solicitante, correo o colegiatura" />
  <v-select v-model="filter" label="Estado de solicitud" :items="['Todas','pending','approved','rejected']" />
  <v-data-table :headers="headers" :items="filtered" :loading="loading" :items-per-page="10">
    <template #item.createdAt="{ value }">{{ adminDate(value) }}</template>
    <template #item.actions="{ item }"><v-btn @click="open(item)">Revisar solicitud</v-btn></template>
    <template #no-data>No hay solicitudes para estos filtros.</template>
  </v-data-table>
  <v-dialog v-model="dialog" max-width="700" scrollable :persistent="saving"><v-card title="Revisar solicitud profesional"><v-card-text>
    <v-alert v-if="formError" type="error">{{ formError }}</v-alert>
    <dl class="request-details"><template v-for="field in fields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ Array.isArray(selected?.[field.key]) ? selected[field.key].join(', ') : selected?.[field.key] || 'Sin dato' }}</dd></template></dl>
    <p class="my-4">Decisión: {{ selected?.status }} · {{ adminDate(selected?.reviewedAt) }} · {{ selected?.reviewedBy || 'Sin revisar' }}</p>
    <p v-if="selected?.rejectionReason">Motivo: {{ selected.rejectionReason }}</p>
    <template v-if="selected?.status==='pending'"><v-select v-model="action" label="Decisión" :items="[{title:'Aprobar',value:'approve'},{title:'Rechazar',value:'reject'}]" />
    <v-textarea v-if="action==='reject'" v-model="reason" label="Motivo del rechazo visible para el solicitante" maxlength="800" />
    <v-checkbox v-model="confirmed" label="Confirmo la decisión sobre esta solicitud" /></template>
  </v-card-text><v-card-actions><v-btn :disabled="saving" @click="dialog=false">Cerrar</v-btn><v-btn v-if="selected?.status==='pending'" :disabled="!confirmed || !action || action==='reject' && !reason.trim()" :loading="saving" @click="save">Guardar decisión</v-btn></v-card-actions></v-card></v-dialog>
</v-container></LayoutDefault></template>
<script setup>
import { computed, ref } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, watchAdminCollection } from "@/services/adminService";
const items=ref([]),loading=ref(false),error=ref(""),search=ref(""),filter=ref("Todas"),dialog=ref(false),selected=ref(null),saving=ref(false),formError=ref(""),action=ref(""),reason=ref(""),confirmed=ref(false);
const headers=[{title:"Estado",key:"status"},{title:"Nombre",key:"professionalName"},{title:"Correo",key:"userEmail"},{title:"Recibida · Lima",key:"createdAt"},{title:"Acciones",key:"actions",sortable:false}];
const fields=[['professionalName','Nombre'],['userEmail','Correo'],['licenseNumber','Colegiatura declarada'],['country','País'],['phone','Teléfono'],['yearsExperience','Años de experiencia declarados'],['specialties','Especialidades'],['approaches','Enfoques'],['modalities','Modalidades'],['practiceLocation','Consulta'],['professionalSummary','Resumen'],['motivation','Motivación']].map(([key,label])=>({key,label}));
const filtered=computed(()=>items.value.filter(i=>(filter.value==='Todas'||i.status===filter.value)&&[i.professionalName,i.userEmail,i.licenseNumber].join(' ').toLowerCase().includes((search.value||'').toLowerCase())));
const workspace=useAdminWorkspace(()=>{items.value=[];dialog.value=false;selected.value=null;saving.value=false;error.value='';reason.value='';action.value='';search.value='';},current=>{loading.value=true;return watchAdminCollection('psychologist_requests',data=>{if(current()){items.value=data.sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));loading.value=false;}},e=>{if(current()){items.value=[];loading.value=false;error.value=e.message;}});});
function open(item){selected.value=item;reason.value='';action.value='';confirmed.value=false;formError.value='';dialog.value=true;}
async function save(){if(saving.value||!confirmed.value)return;const current=workspace.capture();saving.value=true;try{await adminCall('reviewPsychologistApplication',{requestId:selected.value.id,action:action.value,rejectionReason:reason.value});if(current())dialog.value=false;}catch(e){if(current())formError.value=e.message;}finally{if(current())saving.value=false;}}
</script>
<style scoped>.request-details dt{font-weight:600;margin-top:12px}.request-details dd{margin:0;overflow-wrap:anywhere}</style>
