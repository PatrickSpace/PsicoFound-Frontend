<template>
  <section class="brand-system-scope onboarding-page min-dvh-page">
    <div class="onboarding-page__image" aria-hidden="true"></div>
    <main class="onboarding-page__main safe-bottom-mobile">
      <div class="onboarding-page__container">
        <MainLogo class="onboarding-page__logo" compact />
        <v-card
          class="onboarding-card card-backgoundcustom"
          elevation="2"
          variant="text"
        >
          <div class="onboarding-card__header">
            <div class="onboarding-card__heading">
              <p class="text-overline text-secondary font-weight-bold mb-1">
                {{ eyebrow }}
              </p>
              <h1 class="responsive-title-lg font-weight-bold">{{ title }}</h1>
              <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
                {{ subtitle }}
              </p>
            </div>
            <v-chip
              v-if="step"
              color="secondary"
              variant="tonal"
              size="small"
            >
              {{ step }}
            </v-chip>
          </div>
          <v-progress-linear
            v-if="progress"
            class="mt-5"
            color="primary"
            :model-value="progress"
            rounded
            height="5"
          />
          <v-divider class="my-5" />
          <slot />
        </v-card>
      </div>
    </main>
  </section>
</template>

<script setup>
import MainLogo from "@/components/Common/MainLogo.vue";

defineProps({
  eyebrow: {
    type: String,
    default: "Configura tu cuenta",
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  step: {
    type: String,
    default: "",
  },
  progress: {
    type: Number,
    default: 0,
  },
});
</script>

<style scoped>
.onboarding-page {
  display: grid;
  grid-template-columns: minmax(260px, 36%) minmax(0, 1fr);
  background: var(--pf-auth-gradient);
}

.onboarding-page__image {
  min-height: 100dvh;
  background:
    linear-gradient(rgba(26, 58, 56, 0.12), rgba(26, 58, 56, 0.3)),
    url("@/assets/img/bg-home.jpg") center / cover no-repeat;
}

.onboarding-page__main {
  min-width: 0;
  max-height: 100dvh;
  overflow-y: auto;
  padding: 36px clamp(20px, 5vw, 72px);
}

.onboarding-page__container {
  width: min(100%, 820px);
  margin-inline: auto;
}

.onboarding-page__logo {
  margin-bottom: 24px;
}

.onboarding-card {
  padding: clamp(20px, 4vw, 36px);
}

.onboarding-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.onboarding-card__heading {
  min-width: 0;
  max-width: 620px;
}

@media (max-width: 960px) {
  .onboarding-page {
    display: block;
  }

  .onboarding-page__image {
    display: none;
  }

  .onboarding-page__main {
    min-height: 100dvh;
    max-height: none;
    padding: 28px 20px;
  }
}

@media (max-width: 600px) {
  .onboarding-page__main {
    padding: 20px 14px 32px;
  }

  .onboarding-page__logo {
    margin-left: 8px;
    margin-bottom: 16px;
  }

  .onboarding-card__header {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
