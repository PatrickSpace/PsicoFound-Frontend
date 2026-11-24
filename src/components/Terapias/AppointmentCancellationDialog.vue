<template>
  <v-dialog :model-value="modelValue" max-width="540" :persistent="busy" @update:model-value="$emit('update:modelValue', $event)">
    <v-card class="pa-4 card-backgoundcustom">
      <v-card-title>Cancelar cita</v-card-title>
      <v-card-text>
        <p class="mb-3">{{ appointment?.fecha }} · {{ appointment?.hora }} · hora de Perú</p>
        <p class="mb-4">{{ policyMessage }}</p>
        <v-textarea v-model="reason" label="Motivo (opcional)" rows="2" maxlength="500" variant="outlined" />
        <v-alert v-if="error" type="error" variant="tonal">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn :disabled="busy" @click="$emit('update:modelValue', false)">Volver</v-btn>
        <v-spacer />
        <v-btn color="error" :loading="busy" @click="confirm">Cancelar cita</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { cancelAppointment, invalidateAppointmentCaches } from "@/services/citaService";
import { cancelPaidBooking } from "@/services/paymentService";
import { appointmentStart } from "@/utils/appointmentTime";
const props = defineProps({ modelValue: Boolean, appointment: Object, psychologist: Boolean });
const emit = defineEmits(["update:modelValue", "cancelled"]);
const busy = ref(false);
const reason = ref("");
const error = ref("");
const paid = computed(() => Boolean(props.appointment?.bookingId || props.appointment?.paymentStatus === "approved"));
const refundable = computed(() => props.psychologist || appointmentStart(props.appointment) - Date.now() > 86400000);
const policyMessage = computed(() => !paid.value ? "Se liberará el horario de la cita." : refundable.value
  ? "Corresponde un reembolso completo. El horario se liberará y podrás consultar el estado de la devolución."
  : "Faltan 24 horas o menos: esta cancelación no tiene reembolso. Se liberará el horario de la cita.");
watch(() => props.modelValue, () => { error.value = ""; reason.value = ""; });
async function confirm() {
  if (busy.value || !props.appointment?.citaId) return;
  busy.value = true;
  try {
    const id = props.appointment.bookingId || props.appointment.citaId;
    const result = paid.value ? await cancelPaidBooking(id, reason.value)
      : await cancelAppointment({ citaId: id, reason: reason.value });
    invalidateAppointmentCaches();
    emit("cancelled", result);
    emit("update:modelValue", false);
  } catch (e) { error.value = e.message || "No pudimos cancelar la cita. Actualiza su estado antes de reintentar."; }
  finally { busy.value = false; }
}
</script>
