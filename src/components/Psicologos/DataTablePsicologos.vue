<template>
  <v-data-table
    class="mt-5 rounded-0"
    :headers="headers"
    :items="therapists"
    item-value="id"
  >
    <template #item.especialidades="{ value }">
      <v-chip-group>
        <v-chip
          v-for="especialidad in value"
          :key="especialidad"
          color="blue"
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
          color="green"
          size="small"
        >
          {{ enfoque }}
        </v-chip>
      </v-chip-group>
    </template>

    <template #item.modalidad="{ item }">
      <v-chip color="deep-purple-accent-2" size="small">
        {{ modalidadTexto(item) }}
      </v-chip>
    </template>

    <template #item.genero="{ value }">
      <span class="text-capitalize">{{ value }}</span>
    </template>

    <template #top>
      <v-toolbar color="cyan-darken-3">
        <v-toolbar-title>Psicologos activos</v-toolbar-title>
        <v-divider class="mx-4" inset vertical></v-divider>
        <v-spacer></v-spacer>

        <v-dialog v-model="dialog" max-width="900px" class="">
          <template #activator="{ props: activatorProps }">
            <v-btn variant="tonal" color="white" v-bind="activatorProps">
              Nuevo terapeuta
            </v-btn>
          </template>

          <v-card class="pa-5">
            <v-card-title>
              <span class="text-h5">{{ formTitle }}</span>
            </v-card-title>
            <v-divider class="mx-4"></v-divider>

            <v-card-text>
              <v-container>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editedItem.nombre"
                      label="Nombre"
                      variant="outlined"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editedItem.avatar"
                      label="Avatar URL"
                      variant="outlined"
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="editedItem.description"
                      label="Descripcion profesional"
                      variant="outlined"
                      rows="2"
                    ></v-textarea>
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="editedItem.mensaje"
                      label="Mensaje para el paciente"
                      variant="outlined"
                      rows="2"
                    ></v-textarea>
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="editedItem.direccion"
                      label="Dirección"
                      variant="outlined"
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
                    ></v-combobox>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-select
                      v-model="editedItem.genero"
                      label="Genero"
                      variant="outlined"
                      clearable
                      :items="generosOptions"
                    ></v-select>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="editedItem.edad"
                      label="Edad"
                      type="number"
                      min="18"
                      variant="outlined"
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

                      <v-card class="ma-5">
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

                      <v-card class="ma-5">
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

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue-darken-1" variant="text" @click="close">
                Cancelar
              </v-btn>
              <v-btn color="blue-darken-1" variant="text" @click="save">
                Guardar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-dialog v-model="dialogDelete" max-width="500px">
          <v-card class="ma-5">
            <v-card-title class="text-h5">
              ¿Seguro que deseas eliminar este terapeuta?
            </v-card-title>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue-darken-1" variant="text" @click="closeDelete">
                Cancelar
              </v-btn>
              <v-btn
                color="blue-darken-1"
                variant="text"
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
      <v-icon
        color="blue-darken-2"
        class="me-2"
        size="small"
        @click="editItem(item)"
      >
        mdi-pencil
      </v-icon>
      <v-icon color="red" size="small" @click="deleteItem(item)">
        mdi-delete
      </v-icon>
    </template>

    <template #no-data>
      <v-btn color="primary" @click="initialize"> Reset </v-btn>
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
const modalidadesOptions = ["Remoto", "Presencial", "Hibrido"];

export default {
  data: () => ({
    dialog: false,
    dialogDelete: false,
    headers: [
      { title: "Nombre", align: "start", sortable: false, key: "nombre" },
      { title: "Especialidades", key: "especialidades", sortable: false },
      { title: "Enfoques", key: "enfoques", sortable: false },
      { title: "Genero", key: "genero" },
      { title: "Edad", key: "edad" },
      { title: "Modalidad", key: "modalidad", sortable: false },
      { title: "Actions", key: "actions", sortable: false },
    ],
    therapists: [],
    loading: false,
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
      colorInicio: "#FF7A7A",
      colorFin: "#6B8DF0",
      gradient: "",
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
      colorInicio: "#FF7A7A",
      colorFin: "#6B8DF0",
      gradient: "",
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
      };
    },

    extractGradientColors(gradient) {
      const fallback = {
        start: "#FF7A7A",
        end: "#6B8DF0",
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
      this.unsubscribeTherapists?.();
      this.unsubscribeTherapists = watchTherapists(
        (therapistsFromDb) => {
          this.therapists = therapistsFromDb.map((item, index) =>
            this.normalizeItem(item, index)
          );
          this.loading = false;
        },
        (error) => {
          console.error("Error loading therapists:", error);
          this.therapists = [];
          this.loading = false;
        }
      );
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
      try {
        if (this.editedItem.id) {
          await deleteTherapist(this.editedItem.id);
        }

        this.therapists.splice(this.editedIndex, 1);
      } catch (error) {
        console.error("Error deleting therapist:", error);
      } finally {
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
          colorInicio: "#FF7A7A",
          colorFin: "#6B8DF0",
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
          colorInicio: "#FF7A7A",
          colorFin: "#6B8DF0",
        };
        this.editedIndex = -1;
      });
    },

    async save() {
      const payload = {
        ...this.editedItem,
        uid: this.editedItem.uid || "ejemplo",
        especialidades: [...(this.editedItem.especialidades || [])],
        enfoques: [...(this.editedItem.enfoques || [])],
        modalidades: [...(this.editedItem.modalidades || [])],
        gradient: this.buildGradient(this.editedItem),
      };

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
        return;
      }

      this.close();
    },
  },
};
</script>
