<template><LayoutDefault layout><v-container v-if="workspace.active.value" class="pa-0">
  <div class="page-header"><h1 class="text-h4 font-weight-bold">Solicitudes de soporte</h1><p>Respuestas visibles para el titular. Este módulo no es una conversación terapéutica.</p></div>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert><v-btn class="mb-4" :loading="loading" @click="workspace.reload">Actualizar</v-btn>
  <v-text-field v-model="search" label="Buscar usuario, mensaje o referencia de pago" clearable />
  <v-select v-model="filter" label="Estado de soporte" :items="['Todas','open','in_progress','resolved']" />
  <v-data-table :headers="headers" :items="filtered" :loading="loading" :items-per-page="10">
    <template #item.createdAt="{ value }">{{ adminDate(value) }}</template>
    <template #item.actions="{ item }"><v-btn @click="open(item)">Revisar</v-btn></template>
    <template #no-data>No hay solicitudes para estos filtros.</template>
  </v-data-table>
  <h2 class="text-h6 mt-8">Solicitudes de eliminación de cuenta</h2>
  <p>La recepción no acredita borrado. «completed_under_policy» conserva los registros exigidos por la política. La ejecución requiere un operador de privacidad, autorización y mantenimiento.</p>
  <v-alert v-if="accountError" type="error">{{ accountError }}</v-alert>
  <v-data-table :headers="accountHeaders" :items="accountRequests" :loading="accountLoading" :items-per-page="10">
    <template #item.createdAt="{ value }">{{ adminDate(value) }}</template>
    <template #item.jobs="{ item }"><p v-for="job in item.jobs" :key="job.id">{{ job.status }} · {{ job.processed }}/{{ job.count }} · {{ job.blockers.join(', ') || 'Sin bloqueantes registrados' }} · {{ adminDate(job.updatedAt) }}</p><span v-if="!item.jobs.length">Pendiente de diagnóstico del operador de privacidad.</span></template>
    <template #no-data>No hay solicitudes de cuenta.</template>
  </v-data-table>
  <v-dialog v-model="dialog" max-width="720" scrollable :persistent="saving"><v-card title="Revisar solicitud"><v-card-text>
    <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
    <p>{{ selected?.requesterName }} · {{ selected?.requesterEmail }}</p><p>{{ adminDate(selected?.createdAt) }}</p><p class="my-4">{{ selected?.message }}</p>
    <v-alert v-if="selected?.paymentOperationId" type="info" variant="tonal" class="mb-4">Pago vinculado: {{ selected.paymentReference }}<v-btn class="mt-2" :to="`/admin/conciliacion?operation=${encodeURIComponent(selected.paymentOperationId)}`">Ver operación</v-btn></v-alert>
    <section v-for="(entry,index) in selected?.responses || []" :key="index" class="mb-4"><p>{{ entry.message }}</p><small>{{ entry.authorUid }} · {{ adminDate(entry.createdAt) }} · {{ entry.status }}</small></section>
    <v-select v-model="status" label="Nuevo estado" :items="statuses" />
    <v-textarea v-model="response" label="Respuesta visible para el usuario" maxlength="1200" counter />
    <p>Si hubo un pago tardío, documenta aquí la revisión y la solución autorizada. Responder no modifica el estado financiero ni mueve dinero.</p>
    <v-checkbox v-model="confirmed" label="Confirmo el envío de esta respuesta al titular" />
  </v-card-text><v-card-actions><v-btn :disabled="saving" @click="dialog=false">Cancelar</v-btn><v-btn :loading="saving" :disabled="!confirmed || !response.trim()" @click="save">Guardar y avisar</v-btn></v-card-actions></v-card></v-dialog>
</v-container></LayoutDefault></template>
<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, adminRequestId, watchAdminCollection } from "@/services/adminService";
const route=useRoute();
const items=ref([]),loading=ref(false),error=ref(''),search=ref(''),filter=ref('Todas'),dialog=ref(false),selected=ref(null),saving=ref(false),formError=ref(''),response=ref(''),status=ref('in_progress'),confirmed=ref(false),requestId=ref(''),accountRequests=ref([]),accountLoading=ref(false),accountError=ref('');
const headers=[{title:'Estado',key:'status'},{title:'Usuario',key:'requesterName'},{title:'Mensaje',key:'message'},{title:'Pago',key:'paymentReference'},{title:'Fecha · Lima',key:'createdAt'},{title:'Acciones',key:'actions',sortable:false}];
const accountHeaders=[{title:'UID titular',key:'requesterUid'},{title:'Estado',key:'status'},{title:'Recibida · Lima',key:'createdAt'},{title:'Diagnóstico y ejecución',key:'jobs'}];
const statuses=computed(()=>selected.value?.status==='resolved'?[{title:'Reabrir en revisión',value:'in_progress'}]:[{title:'En revisión',value:'in_progress'},{title:'Resuelta',value:'resolved'}]);
const filtered=computed(()=>items.value.filter(i=>(filter.value==='Todas'||i.status===filter.value)&&[i.requesterName,i.requesterEmail,i.message,i.paymentReference,i.paymentOperationId].join(' ').toLowerCase().includes((search.value||'').toLowerCase())));
const workspace=useAdminWorkspace(()=>{items.value=[];accountRequests.value=[];dialog.value=false;selected.value=null;response.value='';saving.value=false;error.value='';accountError.value='';search.value=typeof route.query.operation==='string'?route.query.operation:'';},current=>{
 loading.value=true;accountLoading.value=true;
 adminCall('getAdministrativeAccountRequests').then(data=>{if(current())accountRequests.value=data.items;}).catch(e=>{if(current())accountError.value=e.message;}).finally(()=>{if(current())accountLoading.value=false;});
 return watchAdminCollection('support_requests',data=>{if(current()){items.value=data;loading.value=false;}},e=>{if(current()){items.value=[];loading.value=false;error.value=e.message;}});
});
function open(item){selected.value=item;response.value='';status.value='in_progress';formError.value='';confirmed.value=false;requestId.value=adminRequestId();dialog.value=true;}
async function save(){if(saving.value||!confirmed.value)return;const current=workspace.capture();saving.value=true;formError.value='';try{await adminCall('respondSupportRequest',{supportRequestId:selected.value.id,status:status.value,response:response.value,expectedVersion:selected.value.version||0,requestId:requestId.value});if(current())dialog.value=false;}catch(e){if(current())formError.value=e.message;}finally{if(current())saving.value=false;}}
</script>
