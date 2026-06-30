<template>
  <v-btn variant="plain" size="x-large" class="my-5 font-weight-black text-h5 mx-0 px-0 bg-transparent theme-contrast-text main-logo"
    :ripple="false" to="/">
    <template v-if="!hideIcon" v-slot:prepend>
      <v-icon size="x-large">mdi-home</v-icon>
    </template>
    PsicoFound
  </v-btn>
</template>
<script setup>
defineProps({
  hideIcon: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.main-logo {
  min-width: 0;
}
</style>
