<template>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
  <v-btn class="mb-4" :loading="loading" @click="workspace.reload">Actualizar</v-btn>
  <v-text-field v-model="search" label="Buscar profesional, UID o especialidad" clearable />
  <v-data-table :headers="headers" :items="filtered" :loading="loading" :items-per-page="10">
    <template #item.activo="{ value }">{{ value === false ? 'Inactivo' : 'Activo' }}</template>
    <template #item.actions="{ item }"><div class="d-flex flex-wrap ga-1"><v-btn @click="edit(item)">Editar profesional</v-btn><v-btn variant="text" @click="inspectSetup(item)">Ver preparación</v-btn></div></template>
    <template #no-data>No hay profesionales para estos filtros.</template>
  </v-data-table>
  <v-dialog v-model="setupDialog" max-width="580" scrollable><v-card title="Preparación de la consulta"><v-card-text>
    <p class="mb-3">{{ setupName }} · Consulta operativa, sin información terapéutica.</p>
    <v-progress-linear v-if="setupLoading" indeterminate aria-label="Consultando preparación" />
    <v-alert v-if="setupError" type="error" variant="tonal">{{ setupError }}</v-alert>
    <template v-if="setup"><v-list>
      <v-list-item title="Habilitación profesional" :subtitle="setup.profileEnabled ? 'Habilitado' : 'Deshabilitado por administración'" />
      <v-list-item title="Cuenta" :subtitle="setup.accountActive ? 'Activa' : 'Suspendida'" />
      <v-list-item title="Perfil" :subtitle="setup.reviewed ? 'Revisado por el profesional' : setup.profileComplete ? 'Pendiente de revisión del profesional' : 'Faltan datos esenciales'" />
      <v-list-item title="Tarifa" :subtitle="setup.rateReady ? 'Tarifa comercial configurada' : setup.rate?.isTest ? 'Tarifa de prueba; requiere una tarifa real' : 'Falta una tarifa comercial válida'" />
      <v-list-item title="Horarios" :subtitle="`${setup.slots.length} bloques futuros compatibles`" />
      <v-list-item title="Nuevas reservas" :subtitle="setup.acceptingBookings ? 'Recepción habilitada; depende de tarifa y horarios vigentes' : 'Pausadas o pendientes de activación'" />
    </v-list><p v-if="setup.legacy" class="text-caption">Perfil anterior a la guía: conserva su operación previa.</p><p class="mt-3">El psicólogo debe elegir su tarifa y activar la recepción desde su propia cuenta.</p></template>
  </v-card-text><v-card-actions><v-btn @click="setupDialog=false">Cerrar</v-btn></v-card-actions></v-card></v-dialog>
  <v-dialog v-model="dialog" max-width="680" scrollable :persistent="saving"><v-card title="Editar profesional"><v-card-text>
    <v-alert v-if="formError" type="error">{{ formError }}</v-alert>
    <p class="mb-4">{{ selected?.uid }} · Colegiatura: {{ selected?.licenseNumber || 'Sin dato' }}</p>
    <v-text-field v-model="form.nombre" label="Nombre profesional" maxlength="180" />
    <v-textarea v-model="form.description" label="Resumen profesional" maxlength="1200" />
    <v-text-field v-model="form.direccion" label="Dirección de consulta" maxlength="180" />
    <v-combobox v-for="field in fields" :key="field.key" v-model="form[field.key]" :label="field.label" multiple chips />
    <v-switch v-model="form.activo" label="Perfil activo" color="secondary" />
    <v-checkbox v-model="confirmed" label="Confirmo la edición y el estado profesional" />
    <p>Última edición: {{ adminDate(selected?.updatedAt) }} · {{ selected?.updatedBy || 'Sin registro anterior' }}</p>
  </v-card-text><v-card-actions><v-btn :disabled="saving" @click="dialog=false">Cancelar</v-btn><v-btn :loading="saving" :disabled="!confirmed" @click="save">Guardar profesional</v-btn></v-card-actions></v-card></v-dialog>
</template>
<script setup>
import { computed, reactive, ref } from "vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, watchAdminCollection } from "@/services/adminService";
const items=ref([]),loading=ref(false),error=ref(""),search=ref(""),dialog=ref(false),selected=ref(null),saving=ref(false),formError=ref(""),confirmed=ref(false);
const fields=[{key:"especialidades",label:"Especialidades"},{key:"enfoques",label:"Enfoques"},{key:"modalidades",label:"Modalidades"}];
const form=reactive({nombre:"",description:"",direccion:"",especialidades:[],enfoques:[],modalidades:[],activo:true});
const setupDialog=ref(false),setupLoading=ref(false),setupError=ref(""),setup=ref(null),setupName=ref("");
let setupRequest=0;
const headers=[{title:"Profesional",key:"nombre"},{title:"UID",key:"uid"},{title:"Estado",key:"activo"},{title:"Especialidades",key:"especialidades"},{title:"Acciones",key:"actions",sortable:false}];
const filtered=computed(()=>items.value.filter(i=>[i.nombre,i.uid,...(i.especialidades||[])].join(" ").toLowerCase().includes((search.value||"").toLowerCase())));
const workspace=useAdminWorkspace(()=>{setupRequest++;setupDialog.value=false;setup.value=null;setupError.value="";setupName.value="";setupLoading.value=false;items.value=[];dialog.value=false;selected.value=null;saving.value=false;error.value="";search.value="";Object.assign(form,{nombre:"",description:"",direccion:"",especialidades:[],enfoques:[],modalidades:[],activo:true});},current=>{loading.value=true;return watchAdminCollection("therapists",data=>{if(current()){items.value=data;loading.value=false;}},e=>{if(current()){items.value=[];loading.value=false;error.value=e.message;}});});
function edit(item){selected.value=item;confirmed.value=false;formError.value="";for(const key of Object.keys(form))form[key]=["especialidades","enfoques","modalidades"].includes(key)?[...(item[key]||[])]:item[key]??(key==="activo"?true:"");dialog.value=true;}
async function save(){if(saving.value||!confirmed.value)return;const current=workspace.capture();saving.value=true;try{await adminCall("updateProfessionalByAdmin",{id:selected.value.id,expectedVersion:selected.value.adminVersion||0,profile:{...form}});if(current())dialog.value=false;}catch(e){if(current())formError.value=e.message;}finally{if(current())saving.value=false;}}
async function inspectSetup(item){const current=workspace.capture(),request=++setupRequest;setupDialog.value=true;setupLoading.value=true;setup.value=null;setupError.value="";setupName.value=item.nombre;try{const result=await adminCall("getProfessionalSetup",{therapistId:item.id});if(current()&&request===setupRequest)setup.value=result;}catch(e){if(current()&&request===setupRequest)setupError.value=e.message;}finally{if(current()&&request===setupRequest)setupLoading.value=false;}}
</script>
