<template>
  <v-select :model-value="modelValue" :items="items" @update:model-value="$emit('update:modelValue', $event)">
    <template #item="{ props, item }">
      <v-list-item v-bind="props">
        <template #title><span class="text-wrap text-break">{{ item.title }}</span></template>
      </v-list-item>
    </template>
    <template #selection="{ item }">
      <span class="text-wrap text-break">{{ item.title }}</span>
    </template>
  </v-select>
</template>
<script setup>
// Keep Vuetify behavior/attributes; only let the full therapy identity wrap.
defineProps({
  modelValue: { type: String, default: "" },
  items: { type: Array, default: () => [] },
});
defineEmits(["update:modelValue"]);
</script>
