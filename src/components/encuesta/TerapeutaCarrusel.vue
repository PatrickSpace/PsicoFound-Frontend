<template>
  <!-- Carousel fuera del dialog -->
  <v-container class="carousel-container pa-0" max-width="1600" fluid>
    <div class="carousel pa-0">
      <div
        v-for="(therapist, index) in visibleTherapists"
        :key="therapist.id"
        class="carousel-card pa-0"
        :class="{
          left1: index === 0,
          left2: index === 1,
          center: index === 2,
          right1: index === 3,
          right2: index === 4,
        }"
        @click="handleCardClick(index)"
      >
        <v-card
          class="carousel-therapist-card pa-5 h-75 w-100 d-flex flex-column align-center justify-center elevation-10"
        >
          <v-avatar
            size="xl"
            class="carousel-avatar mb-4 border-lg border-opacity-75"
          >
            <img :src="therapist.avatar" alt="avatar" />
          </v-avatar>
          <h5 class="text-h5 mt-5">{{ therapist.nombre }}</h5>
          <p class="text-center mb-5 text-body-2">
            {{ therapist.description }}
          </p>
          <v-row class="mt-5 w-100 text-center">
            <v-col class="h-auto">
              <strong>Ayuda en:</strong> <br />{{ therapist.especialidades }}
            </v-col>
            <v-col>
              <strong>Enfoque:</strong> <br />
              {{ therapist.enfoques }}
            </v-col>
          </v-row>

          <!-- Mostrar botón solo en la tarjeta central -->
          <v-btn
            v-if="index === 2"
            variant="tonal"
            size="large"
            class="mb-10"
            append-icon="mdi-arrow-right"
            @click.stop="openDialog(index)"
          >
            Agendar cita
          </v-btn>
        </v-card>
      </div>
    </div>
  </v-container>

  <!-- Footer
  <p class="footerchoose position-fixed bottom-0">
    {{ therapists[currentIndex].mensaje}}
  </p>
  -->
  
  <!-- Dialog separado: sólo muestra el modal cuando dialog === true -->
  <v-dialog
    v-model="dialog"
    max-width="1100"
    persistent
    scrim="rgba(var(--v-theme-brand-primary), 0.86)"
  >
    <v-card class="dialog-root pa-0" v-if="selectedTherapist">
      <!-- Header: month + navigation + close -->
      <v-sheet
        class="dialog-header d-flex align-center justify-center pa-4"
        elevation="0"
      >
        <div class="text-center d-flex align-center position-absolute">
          <v-btn icon variant="text" @click="prevMonth"
            ><v-icon>mdi-chevron-left</v-icon></v-btn
          >
          <div class="dialog-month mx-6 text-h6">{{ monthLabel }}</div>
          <v-btn icon variant="text" @click="nextMonth"
            ><v-icon>mdi-chevron-right</v-icon></v-btn
          >
        </div>

        <v-btn icon variant="text" class="ml-auto" @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-sheet>

      <!-- FIX: Abrir <v-card-text> que faltaba -->
      <v-card-text class="pa-0">
        <!-- Grid de días + horarios (foreground) -->
        <div class="schedule-foreground pa-6">
          <!-- Días (header) -->
          <v-row class="mb-4" dense>
            <v-col
              v-for="(day, i) in weekdays"
              :key="day"
              class="d-flex justify-center"
            >
              <v-btn size="x-large" color="secondary" class="day-pill">
                {{ day }}
              </v-btn>
            </v-col>
          </v-row>

          <!-- Horarios: filas por hora, columnas por día -->
          <div class="times-grid">
            <div class="times-row" v-for="time in times" :key="time">
              <div
                class="time-cell"
                v-for="(day, dayIndex) in weekdays"
                :key="dayIndex"
              >
                <v-btn
                  class="time-btn"
                  :variant="isSelectedSlot(dayIndex, time)"
                  :color="slotColor(dayIndex, time) || 'secondary'"
                  size="large"
                  @click="selectSlot(dayIndex, time)"
                >
                  {{ time }}
                </v-btn>
              </div>
            </div>
          </div>

          <!-- Acción final -->
          <div class="d-flex justify-end mt-6">
            <v-btn
              variant="tonal"
              color="secondary"
              :disabled="!selectedSlot"
              @click="confirmAppointment"
              to="/dashboard"
            >
              Agendar cita
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";

// reemplazar la fuente de datos por una prop
const props = defineProps({
  terapeutas: {
    type: Array,
    default: () => [],
  },
});

console.log("TerapeutaCarrusel recibidos:", props.terapeutas);

// usar la prop como fuente (computed para mantener reactividad)
const therapists = computed(() => Array.isArray(props.terapeutas) ? props.terapeutas : [])

// asegurar índice válido; si el array cambia ajustamos el índice
const currentIndex = ref(0) // comienza en 0 para evitar out-of-bounds
watch(therapists, (newVal) => {
  const len = newVal.length
  if (len === 0) {
    currentIndex.value = 0
  } else if (currentIndex.value >= len) {
    // centrar en el medio si es posible
    currentIndex.value = Math.floor(len / 2)
  }
}, { immediate: true })

const visibleTherapists = computed(() => {
  const total = therapists.value.length
  if (total === 0) return []
  const order = [-2, -1, 0, 1, 2].map(
    (offset) => (currentIndex.value + offset + total) % total
  )
  return order.map((i) => therapists.value[i])
})

// active therapist seguro para usar en la plantilla
const activeTherapist = computed(() => {
  return therapists.value.length > 0 && therapists.value[currentIndex.value]
    ? therapists.value[currentIndex.value]
    : null
})

function handleCardClick(index) {
  if (index === 2) return
  const offset = index - 2
  const len = therapists.value.length
  if (len === 0) return
  currentIndex.value = (currentIndex.value + offset + len) % len
}

// Nuevo: estado y función para abrir el dialog con el terapeuta seleccionado
const dialog = ref(false)
const selectedTherapist = ref(null)
function openDialog(index) {
  const vt = visibleTherapists.value
  if (!Array.isArray(vt) || !vt[index]) return
  selectedTherapist.value = vt[index]
  dialog.value = true
}

// calendario y demás (mantengo tu estado)
const now = new Date()
const currentMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))

const weekdays = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
]
const times = ref(["08:00", "09:00", "10:00", "15:00"])

const selectedSlot = ref(null)

</script>

<style scoped>
.carousel-container {
  position: relative;
}

.carousel {
  display: flex;
  transition: transform 0.5s ease;
}

.carousel-card {
  min-width: 300px;
  margin: 0 10px;
  cursor: pointer;
}

.left1 {
  transform: translateX(-50px);
}

.left2 {
  transform: translateX(-25px);
}

.center {
  transform: scale(1.1);
}

.carousel-therapist-card {
  background:
    radial-gradient(circle at 78% 16%, rgba(var(--v-theme-brand-accent), 0.34), transparent 38%),
    linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
}

.carousel-avatar {
  border-color: rgba(var(--v-theme-border-subtle), 0.75) !important;
}

.right1 {
  transform: translateX(25px);
}

.right2 {
  transform: translateX(50px);
}

.footerchoose {
  width: 100%;
  text-align: center;
  padding: 10px 0;
  background-color: rgba(var(--v-theme-background-primary), 0.7);
}

.dialog-root {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-secondary)), rgb(var(--v-theme-primary)));
  color: rgb(var(--v-theme-on-secondary));
}

.day-pill {
  border-radius: 16px;
  min-width: 40px;
  height: 40px;
}

.time-btn {
  border-radius: 8px;
  min-width: 60px;
  height: 60px;
}

.schedule-foreground {
  position: relative;
  z-index: 1;
}

</style>
