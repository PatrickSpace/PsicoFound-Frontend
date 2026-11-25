<template>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
    {{ error }} <v-btn variant="text" @click="load">Reintentar</v-btn>
  </v-alert>
  <v-alert v-for="booking in visibleBookings" :key="booking.id" type="info" variant="tonal" class="mb-4">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3">
      <div><strong>{{ label(booking.paymentStatus) }}</strong>
        <div>{{ booking.date }} · {{ booking.startTime }} · {{ money(booking.priceAmount) }}</div>
      </div>
      <v-btn v-if="['created', 'rejected', 'provider_error'].includes(booking.paymentStatus) && booking.status !== 'expired'"
        variant="outlined" @click="checkout = booking">Reintentar pago</v-btn>
      <v-btn v-if="booking.status === 'confirmed'" variant="text" @click="cancelled = booking">Cancelar cita</v-btn>
    </div>
  </v-alert>
  <v-dialog :model-value="Boolean(checkout)" max-width="680" @update:model-value="checkout = null">
    <v-card v-if="checkout" class="pa-4"><BookingPaymentPanel :booking="checkout" :payer-email="auth.currentUser?.email || ''"
      @completed="complete" /><v-btn @click="checkout = null">Cerrar</v-btn></v-card>
  </v-dialog>
  <AppointmentCancellationDialog :model-value="Boolean(cancelled)"
    :appointment="cancelled ? { ...cancelled, citaId: cancelled.id, bookingId: cancelled.id, fecha: cancelled.date, hora: cancelled.startTime } : null"
    @update:model-value="cancelled = null" @cancelled="load" />
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/store/auth';
import { getMyPaymentBookings } from '@/services/marketplacePaymentService';
import { watchAppointmentChanges } from '@/services/appointmentRepository';
import BookingPaymentPanel from './BookingPaymentPanel.vue';
import AppointmentCancellationDialog from '@/components/Terapias/AppointmentCancellationDialog.vue';
const auth = useAuthStore();
const bookings = ref([]), error = ref(''), checkout = ref(null), cancelled = ref(null);
let generation = 0, stop = () => {};
const visibleBookings = computed(() => bookings.value.filter(booking =>
  !['approved', 'refunded'].includes(booking.paymentStatus)));
async function load() {
  const current = ++generation;
  error.value = '';
  try {
    const result = await getMyPaymentBookings();
    if (current === generation) bookings.value = result.bookings || [];
  } catch {
    if (current === generation) error.value = 'No pudimos consultar tus reservas. Reintenta la consulta.';
  }
}
function complete() { checkout.value = null; load(); }
watch(() => auth.currentUser?.uid, uid => {
  generation++; stop(); bookings.value = []; checkout.value = null; cancelled.value = null;
  if (uid) { load(); stop = watchAppointmentChanges({ patientId: uid }, load, () => {}); }
}, { immediate: true });
onBeforeUnmount(() => { generation++; stop(); });
const money = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0) / 100);
const label = status => ({ created: 'Pago pendiente', pending: 'Estamos confirmando tu pago', processing: 'Pago en proceso',
  rejected: 'Pago rechazado', provider_error: 'Servicio de pagos no disponible', refund_pending: 'Reembolso en proceso',
  manual_review: 'Pago en revisión' })[status] || 'Reserva pendiente';
</script>
