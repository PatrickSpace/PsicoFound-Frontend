<template>
  <v-data-table
    class="therapists-table card-backgoundcustom"
    :headers="headers"
    :items="therapists"
    item-value="id"
    :loading="loading"
    loading-text="Cargando psicólogos..."
    :no-data-text="loadingError || 'No hay psicólogos para mostrar'"
  >
    <template #item.especialidades="{ value }">
      <v-chip-group>
        <v-chip
          v-for="especialidad in value"
          :key="especialidad"
          color="secondary"
          variant="tonal"
          size="small"
        >
          {{ especialidad }}
        </v-chip>
      </v-chip-group>
    </template>

    <template #item.enfoques="{ value }">
      <v-chip-group>
        <v-chip
          v-for="enfoque in value"
          :key="enfoque"
          color="info"
          variant="tonal"
          size="small"
        >
          {{ enfoque }}
        </v-chip>
      </v-chip-group>
    </template>

    <template #item.modalidad="{ item }">
      <v-chip color="secondary" variant="tonal" size="small">
        {{ modalidadTexto(item) }}
      </v-chip>
    </template>

    <template #item.genero="{ value }">
      <span class="text-capitalize">{{ value }}</span>
    </template>

    <template #item.uid="{ value }">
      <v-chip
        :color="value && value !== 'ejemplo' ? 'success' : 'warning'"
        size="small"
        variant="tonal"
      >
        {{ value && value !== "ejemplo" ? "Vinculado" : "Sin UID" }}
      </v-chip>
    </template>

    <template #item.activo="{ value }">
      <v-chip :color="value ? 'success' : 'secondary'" size="small" variant="tonal">
        {{ value ? "Activo" : "Inactivo" }}
      </v-chip>
    </template>

    <template #top>
      <v-toolbar class="px-2" color="transparent" density="comfortable">
        <v-toolbar-title class="text-h6 font-weight-bold">
          Psicólogos activos
        </v-toolbar-title>
        <v-spacer></v-spacer>

        <v-dialog v-model="dialog" max-width="900px">
          <template #activator="{ props: activatorProps }">
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-account-plus-outline"
              v-bind="activatorProps"
            >
              Nuevo terapeuta
            </v-btn>
          </template>

          <v-card class="pa-5 card-backgoundcustom" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-account-heart-outline</v-icon>
              <span>{{ formTitle }}</span>
            </v-card-title>
            <v-divider></v-divider>

            <v-card-text>
              <v-container class="pa-0 pt-5">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editedItem.nombre"
                      label="Nombre"
                      variant="outlined"
                      density="comfortable"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editedItem.avatar"
                      label="Avatar URL"
                      variant="outlined"
                      density="comfortable"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="8">
                    <v-text-field
                      v-model="editedItem.uid"
                      label="UID del usuario psicólogo"
                      variant="outlined"
                      hint="Debe coincidir con el UID de Firebase Auth para habilitar su agenda."
                      persistent-hint
                      density="comfortable"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-switch
                      v-model="editedItem.activo"
                      color="secondary"
                      inset
                      label="Perfil activo"
                    ></v-switch>
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="editedItem.description"
                      label="Descripción profesional"
                      variant="outlined"
                      rows="2"
                      density="comfortable"
                    ></v-textarea>
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="editedItem.mensaje"
                      label="Mensaje para el paciente"
                      variant="outlined"
                      rows="2"
                      density="comfortable"
                    ></v-textarea>
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="editedItem.direccion"
                      label="Dirección"
                      variant="outlined"
                      density="comfortable"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-combobox
                      v-model="editedItem.especialidades"
                      label="Especialidades"
                      variant="outlined"
                      chips
                      clearable
                      multiple
                      :items="especialidadesOptions"
                      density="comfortable"
                    ></v-combobox>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-combobox
                      v-model="editedItem.enfoques"
                      label="Enfoques"
                      variant="outlined"
                      chips
                      clearable
                      multiple
                      :items="enfoquesOptions"
                      density="comfortable"
                    ></v-combobox>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-select
                      v-model="editedItem.genero"
                      label="Género"
                      variant="outlined"
                      clearable
                      :items="generosOptions"
                      density="comfortable"
                    ></v-select>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="editedItem.edad"
                      label="Edad"
                      type="number"
                      min="18"
                      variant="outlined"
                      density="comfortable"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-combobox
                      v-model="editedItem.modalidades"
                      label="Modalidades"
                      variant="outlined"
                      chips
                      clearable
                      multiple
                      :items="modalidadesOptions"
                      density="comfortable"
                    ></v-combobox>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-menu :close-on-content-click="false">
                      <template #activator="{ props: activatorProps }">
                        <v-text-field
                          v-bind="activatorProps"
                          :model-value="editedItem.colorInicio"
                          label="Color inicial"
                          variant="outlined"
                          readonly
                          density="comfortable"
                        >
                          <template #prepend-inner>
                            <v-avatar
                              size="18"
                              :color="editedItem.colorInicio"
                              rounded="circle"
                            ></v-avatar>
                          </template>
                        </v-text-field>
                      </template>

                      <v-card class="ma-5 card-backgoundcustom" elevation="2" variant="text">
                        <v-color-picker
                          v-model="editedItem.colorInicio"
                          hide-inputs
                          show-swatches
                        ></v-color-picker>
                      </v-card>
                    </v-menu>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-menu :close-on-content-click="false">
                      <template #activator="{ props: activatorProps }">
                        <v-text-field
                          v-bind="activatorProps"
                          :model-value="editedItem.colorFin"
                          label="Color final"
                          variant="outlined"
                          readonly
                          density="comfortable"
                        >
                          <template #prepend-inner>
                            <v-avatar
                              size="18"
                              :color="editedItem.colorFin"
                              rounded="circle"
                            ></v-avatar>
                          </template>
                        </v-text-field>
                      </template>

                      <v-card class="ma-5 card-backgoundcustom" elevation="2" variant="text">
                        <v-color-picker
                          v-model="editedItem.colorFin"
                          hide-inputs
                          show-swatches
                        ></v-color-picker>
                      </v-card>
                    </v-menu>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-card
                      class="d-flex align-center justify-center text-white"
                      rounded="lg"
                      height="100%"
                      :style="{ background: buildGradient(editedItem) }"
                    >
                      <v-card-text class="text-center">
                        Vista previa del gradiente
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </v-container>
            </v-card-text>

            <v-card-actions class="px-0 pb-0">
              <v-spacer></v-spacer>
              <v-btn color="secondary" variant="text" :disabled="saving" @click="close">
                Cancelar
              </v-btn>
              <v-btn
                color="secondary"
                variant="tonal"
                :loading="saving"
                :disabled="saving"
                @click="save"
              >
                Guardar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-dialog v-model="dialogDelete" max-width="500px">
          <v-card class="ma-5 card-backgoundcustom" elevation="2" variant="text">
            <v-card-title class="text-h6 font-weight-bold">
              ¿Seguro que deseas eliminar este terapeuta?
            </v-card-title>
            <v-card-actions class="px-6 pb-5">
              <v-spacer></v-spacer>
              <v-btn color="secondary" variant="text" :disabled="deleting" @click="closeDelete">
                Cancelar
              </v-btn>
              <v-btn
                color="error"
                variant="tonal"
                :loading="deleting"
                :disabled="deleting"
                @click="deleteItemConfirm"
              >
                Eliminar
              </v-btn>
              <v-spacer></v-spacer>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-toolbar>
    </template>

    <template #item.actions="{ item }">
      <v-btn
        icon="mdi-pencil"
        color="secondary"
        variant="text"
        size="small"
        aria-label="Editar terapeuta"
        @click="editItem(item)"
      />
      <v-btn
        icon="mdi-delete-outline"
        color="error"
        variant="text"
        size="small"
        aria-label="Eliminar terapeuta"
        @click="deleteItem(item)"
      />
    </template>

    <template #no-data>
      <v-empty-state
        icon="mdi-account-search-outline"
        headline="No hay psicólogos para mostrar"
        text="Actualiza la tabla o registra un nuevo terapeuta."
      >
        <template #actions>
          <v-btn color="secondary" variant="tonal" @click="initialize">
            Actualizar
          </v-btn>
        </template>
      </v-empty-state>
    </template>
  </v-data-table>
</template>

<script>
import {
  createTherapist,
  deleteTherapist,
  updateTherapist,
  watchTherapists,
} from "@/services/psicologoService";
import {
  TABLE_LOADING_TIMEOUT_MESSAGE,
  TABLE_LOADING_TIMEOUT_MS,
  notifyTableLoadingTimeout,
} from "@/utils/tableLoadingTimeout";
import { defaultTherapistGradientStops } from "@/plugins/theme/tokens";

const especialidadesOptions = [
  "Abuso de sustancias",
  "Ansiedad",
  "Depresión",
  "Trauma infantil",
  "Ansiedad social",
  "Problemas de pareja",
  "Problemas familiares",
  "Problemas laborales",
  "Problemas de autoestima",
  "Problemas de identidad",
  "Procrastinación",
];

const enfoquesOptions = [
  "Humanista",
  "Cognitivo-Conductual",
  "Psicoanálisis",
  "Integrativo",
  "Terapia Familiar",
];

const generosOptions = ["femenino", "masculino"];
const modalidadesOptions = ["Remoto", "Presencial", "Híbrido"];
const defaultGradientStart = defaultTherapistGradientStops.start;
const defaultGradientEnd = defaultTherapistGradientStops.end;

export default {
  data: () => ({
    dialog: false,
    dialogDelete: false,
    headers: [
      { title: "Nombre", align: "start", sortable: false, key: "nombre" },
      { title: "Especialidades", key: "especialidades", sortable: false },
      { title: "Enfoques", key: "enfoques", sortable: false },
      { title: "Género", key: "genero" },
      { title: "Edad", key: "edad" },
      { title: "Modalidad", key: "modalidad", sortable: false },
      { title: "UID", key: "uid", sortable: false },
      { title: "Estado", key: "activo" },
      { title: "Actions", key: "actions", sortable: false },
    ],
    therapists: [],
    loading: false,
    saving: false,
    deleting: false,
    loadingError: "",
    loadingTimeoutId: null,
    unsubscribeTherapists: null,
    editedIndex: -1,
    editedItem: {
      id: null,
      uid: "ejemplo",
      nombre: "",
      avatar: "",
      description: "",
      mensaje: "",
      direccion: "",
      especialidades: [],
      enfoques: [],
      genero: "",
      edad: null,
      modalidades: [],
      colorInicio: defaultGradientStart,
      colorFin: defaultGradientEnd,
      gradient: "",
      activo: true,
    },
    defaultItem: {
      id: null,
      uid: "ejemplo",
      nombre: "",
      avatar: "",
      description: "",
      mensaje: "",
      direccion: "",
      especialidades: [],
      enfoques: [],
      genero: "",
      edad: null,
      modalidades: [],
      colorInicio: defaultGradientStart,
      colorFin: defaultGradientEnd,
      gradient: "",
      activo: true,
    },
    especialidadesOptions,
    enfoquesOptions,
    generosOptions,
    modalidadesOptions,
  }),

  computed: {
    formTitle() {
      return this.editedIndex === -1 ? "Nuevo terapeuta" : "Editar terapeuta";
    },
  },

  watch: {
    dialog(val) {
      if (!val) this.close();
    },
    dialogDelete(val) {
      if (!val) this.closeDelete();
    },
  },

  mounted() {
    this.initialize();
  },

  beforeUnmount() {
    this.clearLoadingTimeout();
    this.unsubscribeTherapists?.();
  },

  methods: {
    normalizeItem(item, index = 0) {
      return {
        id: item.id ?? index + 1,
        uid: item.uid ?? "ejemplo",
        nombre: item.nombre ?? "",
        avatar: item.avatar ?? "",
        description: item.description ?? "",
        mensaje: item.mensaje ?? "",
        direccion: item.direccion ?? "",
        especialidades: Array.isArray(item.especialidades)
          ? [...item.especialidades]
          : Array.isArray(item.especialidad)
          ? [...item.especialidad]
          : [],
        enfoques: Array.isArray(item.enfoques)
          ? [...item.enfoques]
          : Array.isArray(item.enfoque)
          ? [...item.enfoque]
          : [],
        genero: item.genero ?? "",
        edad: item.edad ?? null,
        modalidades: Array.isArray(item.modalidades)
          ? [...item.modalidades]
          : item.modalidad
          ? [item.modalidad]
          : [],
        colorInicio: this.extractGradientColors(item.gradient).start,
        colorFin: this.extractGradientColors(item.gradient).end,
        gradient: item.gradient ?? "",
        activo: item.activo ?? true,
      };
    },

    extractGradientColors(gradient) {
      const fallback = {
        start: defaultGradientStart,
        end: defaultGradientEnd,
      };

      if (!gradient || typeof gradient !== "string") {
        return fallback;
      }

      const matches = gradient.match(/#(?:[0-9a-fA-F]{3}){1,2}/g);

      if (!matches || matches.length < 2) {
        return fallback;
      }

      return {
        start: matches[0],
        end: matches[1],
      };
    },

    buildGradient(item) {
      return `linear-gradient(to bottom right, ${item.colorInicio}, ${item.colorFin})`;
    },

    initialize() {
      this.loading = true;
      this.loadingError = "";
      this.clearLoadingTimeout();
      this.unsubscribeTherapists?.();
      this.loadingTimeoutId = window.setTimeout(() => {
        this.loading = false;
        this.loadingError = TABLE_LOADING_TIMEOUT_MESSAGE;
        this.therapists = [];
        this.unsubscribeTherapists?.();
        this.unsubscribeTherapists = null;
        notifyTableLoadingTimeout(TABLE_LOADING_TIMEOUT_MESSAGE);
      }, TABLE_LOADING_TIMEOUT_MS);
      this.unsubscribeTherapists = watchTherapists(
        (therapistsFromDb) => {
          this.clearLoadingTimeout();
          this.therapists = therapistsFromDb.map((item, index) =>
            this.normalizeItem(item, index)
          );
          this.loadingError = "";
          this.loading = false;
        },
        (error) => {
          this.clearLoadingTimeout();
          console.error("Error loading therapists:", error);
          this.therapists = [];
          this.loadingError = "No se pudieron cargar los psicólogos.";
          this.loading = false;
        }
      );
    },

    clearLoadingTimeout() {
      if (!this.loadingTimeoutId) {
        return;
      }

      window.clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    },

    modalidadTexto(item) {
      if (Array.isArray(item.modalidades) && item.modalidades.length > 0) {
        return item.modalidades.join(", ");
      }

      return "No definida";
    },

    editItem(item) {
      this.editedIndex = this.therapists.findIndex(
        (therapist) => therapist.id === item.id
      );
      this.editedItem = {
        ...item,
        especialidades: [...(item.especialidades || [])],
        enfoques: [...(item.enfoques || [])],
        modalidades: [...(item.modalidades || [])],
        colorInicio: this.extractGradientColors(item.gradient).start,
        colorFin: this.extractGradientColors(item.gradient).end,
      };
      this.dialog = true;
    },

    deleteItem(item) {
      this.editedIndex = this.therapists.findIndex(
        (therapist) => therapist.id === item.id
      );
      this.editedItem = { ...item };
      this.dialogDelete = true;
    },

    deleteItemConfirm() {
      this.confirmDelete();
    },

    async confirmDelete() {
      if (this.deleting) {
        return;
      }

      this.deleting = true;

      try {
        if (this.editedItem.id) {
          await deleteTherapist(this.editedItem.id);
        }

        this.therapists.splice(this.editedIndex, 1);
      } catch (error) {
        console.error("Error deleting therapist:", error);
        window.dispatchEvent(
          new CustomEvent("api-error", {
            detail: {
              message: error?.message || "No se pudo eliminar el psicólogo.",
            },
          })
        );
      } finally {
        this.deleting = false;
        this.closeDelete();
      }
    },

    close() {
      this.dialog = false;
      this.$nextTick(() => {
        this.editedItem = {
          ...this.defaultItem,
          especialidades: [],
          enfoques: [],
          modalidades: [],
          colorInicio: defaultGradientStart,
          colorFin: defaultGradientEnd,
          activo: true,
        };
        this.editedIndex = -1;
      });
    },

    closeDelete() {
      this.dialogDelete = false;
      this.$nextTick(() => {
        this.editedItem = {
          ...this.defaultItem,
          especialidades: [],
          enfoques: [],
          modalidades: [],
          colorInicio: defaultGradientStart,
          colorFin: defaultGradientEnd,
          activo: true,
        };
        this.editedIndex = -1;
      });
    },

    async save() {
      if (this.saving) {
        return;
      }

      const payload = {
        ...this.editedItem,
        uid: this.editedItem.uid || "ejemplo",
        especialidades: [...(this.editedItem.especialidades || [])],
        enfoques: [...(this.editedItem.enfoques || [])],
        modalidades: [...(this.editedItem.modalidades || [])],
        gradient: this.buildGradient(this.editedItem),
        activo: this.editedItem.activo ?? true,
      };

      this.saving = true;

      try {
        if (this.editedIndex > -1 && this.editedItem.id) {
          const updatedTherapist = await updateTherapist(
            this.editedItem.id,
            payload
          );
          Object.assign(this.therapists[this.editedIndex], updatedTherapist);
        } else {
          const createdTherapist = await createTherapist(payload);
          this.therapists.push(createdTherapist);
        }
      } catch (error) {
        console.error("Error saving therapist:", error);
        window.dispatchEvent(
          new CustomEvent("api-error", {
            detail: {
              message: error?.message || "No se pudo guardar el psicólogo.",
            },
          })
        );
        return;
      } finally {
        this.saving = false;
      }

      this.close();
    },
  },
};
</script>

<style scoped>
.therapists-table {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
}

:global(.v-theme--light) .therapists-table {
  border-color: rgba(var(--v-theme-border-subtle), 0.16);
}

@media (max-width: 599px) {
  .therapists-table :deep(.v-toolbar) {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 12px;
    padding-top: 12px;
  }

  .therapists-table :deep(.v-toolbar__content) {
    align-items: stretch;
    flex-wrap: wrap;
    height: auto !important;
    row-gap: 10px;
  }

  .therapists-table :deep(.v-toolbar-title) {
    flex-basis: 100%;
    margin-inline-start: 0;
  }
}
</style>
