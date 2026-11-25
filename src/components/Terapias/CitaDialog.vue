<template>
  <component :is="dialogComponent" v-bind="{ ...$attrs, initialAppointment }"
    @update:model-value="emit('update:modelValue', $event)" @saved="emit('saved', $event)" />
</template>
<script setup>
import { computed, defineAsyncComponent } from 'vue';
import ManualCitaDialog from './ManualCitaDialog.vue';
import { automatedPaymentsEnabled } from '@/config/paymentClientConfig';
defineOptions({ inheritAttrs: false });
const emit = defineEmits(['update:modelValue', 'saved']);
const props = defineProps({ initialAppointment: { type: Object, default: () => ({}) } });
const automatedDialog = defineAsyncComponent(() => import('./AutomatedCitaDialog.vue'));
const dialogComponent = computed(() => automatedPaymentsEnabled ||
  Boolean(props.initialAppointment.bookingId)
  ? automatedDialog : ManualCitaDialog);
</script>
