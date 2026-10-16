<template>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
  <v-btn class="mb-4" :loading="loading" @click="workspace.reload">Actualizar</v-btn>
  <v-text-field v-model="search" label="Buscar profesional, UID o especialidad" clearable />
  <v-data-table :headers="headers" :items="filtered" :loading="loading" :items-per-page="10">
    <template #item.activo="{ value }">{{ value === false ? 'Inactivo' : 'Activo' }}</template>
    <template #item.actions="{ item }"><v-btn @click="edit(item)">Editar profesional</v-btn></template>
    <template #no-data>No hay profesionales para estos filtros.</template>
  </v-data-table>
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
const headers=[{title:"Profesional",key:"nombre"},{title:"UID",key:"uid"},{title:"Estado",key:"activo"},{title:"Especialidades",key:"especialidades"},{title:"Acciones",key:"actions",sortable:false}];
const filtered=computed(()=>items.value.filter(i=>[i.nombre,i.uid,...(i.especialidades||[])].join(" ").toLowerCase().includes((search.value||"").toLowerCase())));
const workspace=useAdminWorkspace(()=>{items.value=[];dialog.value=false;selected.value=null;saving.value=false;error.value="";search.value="";Object.assign(form,{nombre:"",description:"",direccion:"",especialidades:[],enfoques:[],modalidades:[],activo:true});},current=>{loading.value=true;return watchAdminCollection("therapists",data=>{if(current()){items.value=data;loading.value=false;}},e=>{if(current()){items.value=[];loading.value=false;error.value=e.message;}});});
function edit(item){selected.value=item;confirmed.value=false;formError.value="";for(const key of Object.keys(form))form[key]=["especialidades","enfoques","modalidades"].includes(key)?[...(item[key]||[])]:item[key]??(key==="activo"?true:"");dialog.value=true;}
async function save(){if(saving.value||!confirmed.value)return;const current=workspace.capture();saving.value=true;try{await adminCall("updateProfessionalByAdmin",{id:selected.value.id,expectedVersion:selected.value.adminVersion||0,profile:{...form}});if(current())dialog.value=false;}catch(e){if(current())formError.value=e.message;}finally{if(current())saving.value=false;}}
</script>
