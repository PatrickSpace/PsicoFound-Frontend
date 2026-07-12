<template>
  <v-btn
    variant="plain"
    class="mx-0 px-0 bg-transparent main-logo"
    :class="{ 'main-logo--compact': compact }"
    aria-label="Ir al inicio de Lurems"
    :ripple="false"
    to="/"
  >
    <img
      :src="
        compact
          ? '/brand/lurems-isotipo-transparent.png'
          : '/brand/lurems-logo-principal-transparent.png'
      "
      alt="Lurems"
      class="main-logo__image"
    />
  </v-btn>
</template>

<script setup>
defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.main-logo {
  align-items: center;
  display: flex !important;
  flex: 0 0 auto;
  height: auto !important;
  line-height: 0;
  min-height: fit-content !important;
  min-width: 0;
  overflow: hidden;
  width: 240px;
}

.main-logo--compact {
  height: 64px !important;
  min-height: 64px !important;
  width: 72px;
}

.main-logo__image {
  display: block;
  height: auto;
  object-fit: contain;
  object-position: left center;
  width: 240px;
}

.main-logo--compact .main-logo__image {
  height: 64px;
  object-fit: contain;
  width: 64px;
}
</style>
