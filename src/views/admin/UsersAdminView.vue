<template>
  <LayoutDefault layout><v-container v-if="workspace.active.value" class="pa-0">
    <div class="page-header"><h1 class="text-h4 font-weight-bold">Usuarios y permisos</h1><p class="mt-2">Cuentas registradas. El correo y las credenciales se gestionan desde la cuenta del titular.</p></div>
    <v-alert type="info" variant="tonal" class="mb-4">Las altas utilizan el registro de la aplicación. La suspensión conserva la información. El estado de cuenta se consulta aquí; no se borran perfiles aislados.</v-alert>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-btn class="mb-4" @click="workspace.reload" :loading="loading">Actualizar</v-btn>
    <v-btn class="mb-4 ml-2" to="/admin/soporte">Solicitudes de cuenta</v-btn>
    <v-text-field v-model="search" label="Buscar por nombre, correo, UID o rol" clearable variant="outlined" />
    <v-data-table :headers="headers" :items="filtered" :loading="loading" :items-per-page="10">
      <template #item.accountStatus="{ item }">{{ item.accountStatus === 'suspended' ? item.suspensionType === 'involuntary' ? 'Suspendida por inactividad' : 'Suspendida voluntaria' : item.accountStatus === 'active' || !item.accountStatus ? 'Activa' : item.accountStatus }}</template>
      <template #item.roles="{ item }">{{ getUserRoles(item).join(', ') }}</template>
      <template #item.actions="{ item }"><v-btn aria-label="Editar usuario" @click="edit(item)">Editar</v-btn></template>
      <template #no-data>No hay cuentas para estos filtros.</template>
    </v-data-table>
    <v-dialog v-model="dialog" max-width="660" :persistent="saving" scrollable><v-card title="Editar usuario">
      <v-card-text><v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
        <p class="mb-4">{{ selected?.id }} · {{ selected?.email }}</p>
        <v-text-field v-model="form.nombre" label="Nombre" maxlength="120" />
        <v-text-field v-model="form.telefono" label="Teléfono" maxlength="40" />
        <v-checkbox v-model="form.patient" label="Acceso paciente" />
        <v-checkbox v-model="form.admin" label="Acceso administrador" />
        <p>La habilitación profesional se decide en Solicitudes. La activación se gestiona en Psicólogos.</p>
        <v-checkbox v-model="confirmed" label="Confirmo los datos y permisos que se guardarán" />
        <h2 class="text-subtitle-1">Historial administrativo</h2>
        <p v-for="entry in history" :key="entry.id">{{ adminDate(entry.createdAt) }} · {{ entry.actorUid }} · {{ entry.action }} · {{ entry.fields?.join(', ') }} {{ entry.roles?.join(', ') }}</p>
        <p v-if="!history.length">Sin cambios administrativos registrados.</p>
      </v-card-text><v-card-actions><v-btn :disabled="saving" @click="dialog=false">Cancelar</v-btn><v-btn :loading="saving" :disabled="!confirmed || !form.nombre.trim()" @click="save">Guardar cambios</v-btn></v-card-actions>
    </v-card></v-dialog>
  </v-container></LayoutDefault>
</template>
<script setup>
import { computed, reactive, ref } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, watchAdminCollection } from "@/services/adminService";
import { getUserRoles } from "@/utils/roles";
const users=ref([]), audit=ref([]), loading=ref(false), error=ref(""), search=ref(""), dialog=ref(false), selected=ref(null), saving=ref(false), formError=ref(""), confirmed=ref(false);
const form=reactive({nombre:"",telefono:"",patient:false,admin:false});
const headers=[{title:"Nombre",key:"nombre"},{title:"Correo",key:"email"},{title:"UID",key:"id"},{title:"Estado",key:"accountStatus"},{title:"Roles",key:"roles"},{title:"Acciones",key:"actions",sortable:false}];
const filtered=computed(()=>users.value.filter(item=>[item.nombre,item.email,item.id,item.accountStatus,item.suspensionType,...getUserRoles(item)].join(" ").toLowerCase().includes((search.value||"").toLowerCase())));
const history=computed(()=>audit.value.filter(item=>item.targetUid===selected.value?.id).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)));
const workspace=useAdminWorkspace(()=>{users.value=[];audit.value=[];dialog.value=false;selected.value=null;saving.value=false;search.value="";error.value="";formError.value="";Object.assign(form,{nombre:"",telefono:"",patient:false,admin:false});}, current=>{
  loading.value=true;
  const failed=e=>{if(current()){users.value=[];audit.value=[];loading.value=false;error.value=e.message;}};
  const stops=[watchAdminCollection("users",items=>{if(current()){users.value=items;loading.value=false;}},failed),watchAdminCollection("admin_audit",items=>{if(current())audit.value=items;},failed)];return ()=>stops.forEach(stop=>stop());
});
function edit(item){selected.value=item;formError.value="";confirmed.value=false;Object.assign(form,{nombre:item.nombre||"",telefono:item.telefono||"",patient:getUserRoles(item).includes("patient"),admin:getUserRoles(item).includes("admin")});dialog.value=true;}
async function save(){if(saving.value||!confirmed.value)return;const current=workspace.capture();saving.value=true;formError.value="";
  const roles=[...(form.patient?["patient"]:[]),...(form.admin?["admin"]:[]),...(getUserRoles(selected.value).includes("psychologist")?["psychologist"]:[])];
  try{await adminCall("updateUserByAdmin",{uid:selected.value.id,nombre:form.nombre,telefono:form.telefono,roles,expectedVersion:selected.value.adminVersion||0});if(current())dialog.value=false;}catch(e){if(current())formError.value=e.message;}finally{if(current())saving.value=false;}}
</script>
