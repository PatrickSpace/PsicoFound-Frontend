<template><LayoutDefault layout><v-container v-if="workspace.active.value" class="pa-0">
  <div class="page-header"><h1 class="text-h4 font-weight-bold">Conciliación y transferencias</h1><p>Registra comprobantes y transferencias verificados fuera del sistema. Ninguna acción de esta pantalla mueve dinero.</p></div>
  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert><v-btn class="mb-4" :loading="loading" @click="workspace.reload">Actualizar</v-btn>
  <v-text-field v-model="search" label="Buscar referencia, operación, paciente o profesional" clearable />
  <v-select v-model="filter" label="Estado del pago" :items="['Todas',...Object.keys(labels)]" />
  <v-checkbox v-model="overdue" label="Solo plazo terminado o que requiere revisión" />
  <v-data-table :headers="headers" :items="filtered" :loading="loading" :items-per-page="10">
    <template #item.status="{ value }">{{ labels[value] || value }}</template>
    <template #item.amountMinor="{ item }">{{ money(item.amountMinor,item.currency) }}</template>
    <template #item.expiresAt="{ value }">{{ adminDate(value) }}</template>
    <template #item.actions="{ item }"><v-btn @click="open(item)">Revisar operación</v-btn></template>
    <template #no-data>No hay operaciones para estos filtros.</template>
  </v-data-table>
  <v-dialog v-model="dialog" max-width="860" scrollable :persistent="saving"><v-card title="Revisar operación"><v-card-text>
    <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
    <template v-if="selected">
      <p><strong>{{ selected.reference }}</strong> · {{ labels[selected.status] }} · {{ money(selected.amountMinor,selected.currency) }}</p>
      <p>Paciente: {{ selected.patientUid }} · Profesional: {{ selected.therapistId }}</p>
      <p>Comprobante del pago original: {{ selected.paymentReference || 'Sin pago conciliado' }}</p>
      <p>Última referencia verificada: {{ selected.providerReference || 'Sin referencia registrada' }}</p>
      <p>Cita: {{ selected.appointmentId }} · Terapia: {{ selected.therapyId }}</p>
      <p v-if="appointmentContext">Cita: {{ adminDate(appointmentContext.startAtIso) }} · {{ appointmentContext.status }}</p>
      <v-progress-linear v-if="contextLoading" indeterminate aria-label="Cargando contexto operativo" />
      <v-alert v-if="contextError" type="error">{{ contextError }}<v-btn @click="loadContext">Reintentar contexto</v-btn></v-alert>
      <p>Plazo: {{ adminDate(selected.expiresAt) }}</p>
      <v-alert v-if="paymentWindow(selected,now)!=='open'" type="warning" variant="tonal" class="my-3">El plazo terminó o requiere revisión. El estado financiero solo cambia con una decisión válida del servidor.</v-alert>
      <h2 class="text-subtitle-1 mt-4">Condiciones capturadas en la reserva</h2>
      <p>Tarifa {{ selected.rateSnapshot?.name }} · versión {{ selected.rateSnapshot?.rateVersion }} · {{ selected.rateSnapshot?.isTest === true ? 'Prueba' : selected.rateSnapshot?.isTest === false ? 'Comercial' : 'Marca de prueba no registrada' }}</p>
      <p>Reparto: profesional {{ selected.rateSnapshot?.psychologistPercent }}% · plataforma {{ selected.rateSnapshot?.platformPercent }}%</p>
      <p>Política: {{ policy?.version || 'Falta: requiere revisión' }} · comercio {{ policy?.merchantAccount }} · plazo {{ policy?.holdMinutes }} min · enviados {{ policy?.submittedExpiration }}</p>
      <p>Cancelación: {{ policy?.patientCancellationCutoffMinutes }} min · reprogramación: {{ policy?.patientRescheduleCutoffMinutes }} min · devolución: {{ policy?.refundMode }}</p>
      <p v-if="selected.refundReason">Solicitud de devolución: {{ selected.refundReason }}</p>
      <p>Conciliación previa: {{ selected.reconciledBy || selected.expiredBy || 'Sin decisión' }} · {{ adminDate(selected.reconciledAt || selected.expiredAt) }}</p>
      <p>{{ selected.reconciliationNote }}</p>
      <v-btn class="my-3" :to="`/admin/soporte?operation=${encodeURIComponent(selected.id)}`">Revisar soporte vinculado</v-btn>
      <p v-if="linkedSupport.length">{{ linkedSupport.length }} solicitudes vinculadas; revisarlas antes de decidir sobre un pago tardío.</p>
      <p v-for="ticket in linkedSupport" :key="ticket.id">{{ ticket.status }} · {{ ticket.message }}</p>
      <template v-if="actions.length">
        <v-select v-model="action" label="Acción de conciliación" :items="actions" />
        <v-text-field v-if="['confirmed','refunded'].includes(action)" v-model="reference" label="Referencia verificable del proveedor" maxlength="180" />
        <v-textarea v-model="note" label="Evidencia o motivo de la decisión" maxlength="600" />
        <v-checkbox v-model="confirmed" label="Revisé los comprobantes, el soporte y las condiciones capturadas" />
        <p v-if="action==='refunded'">Solo registra una devolución ya verificada externamente. No envía dinero.</p>
        <v-btn :loading="saving" :disabled="!confirmed || !action || !note.trim() || ['confirmed','refunded'].includes(action) && !reference.trim()" @click="review">Confirmar conciliación</v-btn>
      </template>
      <p v-else class="my-4">No hay una transición financiera disponible para este estado y política. Una reserva cerrada no se reactiva; resuelve pagos tardíos por soporte bajo autorización comercial.</p>
      <h2 class="text-h6 mt-6">Obligación profesional</h2>
      <template v-if="obligation">
        <p>Estado: {{ obligation.status }}</p><p>Calculado: {{ money(obligation.calculatedMinor,obligation.currency) }} · pendiente: {{ money(obligation.pendingMinor,obligation.currency) }} · transferido registrado: {{ money(obligation.paidMinor,obligation.currency) }}</p>
        <v-alert v-if="obligation.status==='recovery_review'" type="warning">Recuperación pendiente de revisión por {{ money(obligation.recoveryReviewMinor,obligation.currency) }}. No se aplican descuentos automáticos.</v-alert>
        <p v-for="transfer in selectedTransfers" :key="transfer.id">{{ transfer.reference || transfer.transferReference }} · {{ money(transfer.amountMinor,transfer.currency) }} · {{ adminDate(transfer.createdAt || transfer.recordedAt) }} · {{ transfer.recordedBy }}</p>
        <template v-if="selected.status==='confirmed' && obligation.pendingMinor>0">
          <v-text-field v-model="transferAmount" label="Importe transferido" inputmode="decimal" :prefix="obligation.currency" />
          <v-text-field v-model="transferReference" label="Referencia única de transferencia externa" maxlength="180" />
          <v-checkbox v-model="transferConfirmed" label="Verifiqué externamente la transferencia, su importe, moneda y destinatario" />
          <v-btn :loading="saving" :disabled="!transferConfirmed || !transferReference.trim()" @click="recordTransfer">Registrar transferencia realizada</v-btn>
        </template>
        <p v-else class="my-3">No se pueden registrar nuevas transferencias con este estado o saldo.</p>
      </template><p v-else>Sin obligación conciliada.</p>
      <h2 class="text-subtitle-1 mt-6">Historial de decisiones</h2><p v-for="entry in selectedAudit" :key="entry.id">{{ adminDate(entry.createdAt) }} · {{ entry.actorUid }} · {{ entry.status }} · {{ entry.providerReference || 'Sin comprobante asociado' }} · {{ entry.note }}</p>
    </template>
  </v-card-text><v-card-actions><v-btn :disabled="saving" @click="dialog=false">Cerrar</v-btn></v-card-actions></v-card></v-dialog>
</v-container></LayoutDefault></template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, watchAdminCollection } from "@/services/adminService";
import { paymentWindow } from "@/utils/paymentDeadline";
import { parseAmountMinor } from "@/utils/paymentRates";
const route=useRoute();
const appointmentContext=ref(null),contextLoading=ref(false),contextError=ref('');
let contextVersion=0;
const operations=ref([]),obligations=ref([]),transfers=ref([]),support=ref([]),audit=ref([]),loading=ref(false),error=ref(''),search=ref(''),filter=ref('Todas'),overdue=ref(false),dialog=ref(false),selectedId=ref(''),saving=ref(false),formError=ref(''),action=ref(''),reference=ref(''),note=ref(''),confirmed=ref(false),transferAmount=ref(''),transferReference=ref(''),transferConfirmed=ref(false),now=ref(Date.now());
const labels={pending:'Pendiente',submitted:'En verificación',confirmed:'Confirmado',rejected:'Rechazado',expired:'Vencido',cancelled:'Cancelado',refund_review:'Devolución en revisión',refunded:'Devuelto'};
const headers=[{title:'Estado',key:'status'},{title:'Referencia',key:'reference'},{title:'Paciente',key:'patientUid'},{title:'Profesional',key:'therapistId'},{title:'Importe',key:'amountMinor'},{title:'Plazo · Lima',key:'expiresAt'},{title:'Acciones',key:'actions',sortable:false}];
const filtered=computed(()=>operations.value.filter(i=>(filter.value==='Todas'||i.status===filter.value)&&(!overdue.value||['pending','submitted'].includes(i.status)&&paymentWindow(i,now.value)!=='open')&&[i.id,i.reference,i.providerReference,i.patientUid,i.therapistId].join(' ').toLowerCase().includes((search.value||'').toLowerCase())));
const selected=computed(()=>operations.value.find(i=>i.id===selectedId.value));
const policy=computed(()=>selected.value?.rateSnapshot?.commercialPolicy);
const obligation=computed(()=>obligations.value.find(i=>i.operationId===selectedId.value));
const selectedTransfers=computed(()=>transfers.value.filter(i=>i.operationId===selectedId.value));
const selectedAudit=computed(()=>audit.value.filter(i=>i.operationId===selectedId.value).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)));
const linkedSupport=computed(()=>support.value.filter(i=>i.paymentOperationId===selectedId.value));
const actions=computed(()=>{
 const payment=selected.value;if(!payment || !policy.value || !appointmentContext.value || contextLoading.value || contextError.value)return [];
 let choices=({pending:['rejected'],submitted:['confirmed','rejected'],refund_review:['refunded','confirmed']})[payment.status]||[];
 if(paymentWindow(payment,now.value)==='elapsed' && (payment.status==='pending'||payment.status==='submitted'&&policy.value.submittedExpiration==='expire'))choices.push('expired');
 if(!['pendiente','confirmada'].includes(appointmentContext.value.status))choices=choices.filter(value=>!['rejected','expired'].includes(value));
 if(appointmentContext.value.status==='cancelada')choices=choices.filter(value=>value!=='confirmed');
 return choices.map(value=>({value,title:value==='expired'?'Vencer y liberar reserva':labels[value]}));
});
function clearForm(){action.value='';reference.value='';note.value='';confirmed.value=false;transferAmount.value='';transferReference.value='';transferConfirmed.value=false;formError.value='';}
const workspace=useAdminWorkspace(()=>{contextVersion++;appointmentContext.value=null;contextError.value='';contextLoading.value=false;operations.value=[];obligations.value=[];transfers.value=[];support.value=[];audit.value=[];dialog.value=false;selectedId.value='';saving.value=false;error.value='';clearForm();search.value=typeof route.query.operation==='string'?route.query.operation:'';},current=>{
 loading.value=true;let remaining=5;const failed=e=>{if(current()){error.value=e.message;operations.value=[];obligations.value=[];transfers.value=[];support.value=[];audit.value=[];loading.value=false;}};
 const stops=[['payment_operations',operations],['professional_obligations',obligations],['professional_transfers',transfers],['support_requests',support],['payment_audit',audit]].map(([name,target])=>watchAdminCollection(name,data=>{if(current()){target.value=data;if(--remaining<=0)loading.value=false;}},failed));
 return ()=>stops.forEach(stop=>stop());
});
async function loadContext(){
 const current=workspace.capture();const version=++contextVersion;
 appointmentContext.value=null;contextError.value='';contextLoading.value=false;
 if(!current()||!selectedId.value)return;
 contextLoading.value=true;
 try{const data=await adminCall('getPaymentOperationContext',{operationId:selectedId.value});if(current()&&version===contextVersion)appointmentContext.value=data;}
 catch(e){if(current()&&version===contextVersion)contextError.value=e.message;}
 finally{if(current()&&version===contextVersion)contextLoading.value=false;}
}
watch(()=>[selectedId.value,selected.value?.updatedAt?.toMillis?.()],loadContext);
onBeforeUnmount(()=>contextVersion++);
const clock=setInterval(()=>now.value=Date.now(),1000);onBeforeUnmount(()=>clearInterval(clock));
function money(value,currency='PEN'){return new Intl.NumberFormat('es-PE',{style:'currency',currency}).format((value||0)/100);}
function open(item){selectedId.value=item.id;clearForm();dialog.value=true;}
async function perform(name,data){if(saving.value)return;const current=workspace.capture();saving.value=true;formError.value='';try{await adminCall(name,data);if(current())clearForm();}catch(e){if(current())formError.value=e.message;}finally{if(current())saving.value=false;}}
function review(){if(!confirmed.value)return;perform(action.value==='expired'?'expirePaymentReservation':'reviewPaymentOperation',{operationId:selectedId.value,status:action.value,providerReference:reference.value.trim(),note:note.value.trim()});}
function recordTransfer(){if(!transferConfirmed.value)return;const amountMinor=parseAmountMinor(transferAmount.value);if(!amountMinor){formError.value='Ingresa un importe válido con hasta dos decimales.';return;}perform('recordProfessionalTransfer',{operationId:selectedId.value,transferReference:transferReference.value.trim(),amountMinor,currency:obligation.value.currency});}
</script>
<style scoped>p{overflow-wrap:anywhere}.v-btn{max-width:100%;height:auto;min-height:36px;padding-block:8px}:deep(.v-btn__content){white-space:normal}.v-card-title{white-space:normal}</style>
