<template>
  <LayoutDefault layout>
    <v-container class="admin-users-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Administración
            </p>
            <h1 class="text-h4 font-weight-bold">Usuarios y permisos</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              Gestiona perfiles, roles de acceso y permisos administrativos.
            </p>
          </div>
          <div class="page-header__actions">
            <v-btn
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-flask-outline"
              class="pf-btn-secondary"
              @click="qaDialog = true"
            >
              Datos QA
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-refresh"
              :loading="loading"
              class="pf-btn-secondary"
              @click="loadUsers"
            >
              Actualizar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-account-plus-outline"
              class="pf-btn-primary"
              @click="openCreateDialog"
            >
              Crear perfil
            </v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-alert
        v-if="errorMessage"
        class="mb-5"
        color="error"
        variant="tonal"
        icon="mdi-alert-outline"
      >
        {{ errorMessage }}
      </v-alert>

      <v-row class="mb-4" align="stretch">
        <v-col
          v-for="stat in stats"
          :key="stat.label"
          cols="12"
          sm="6"
          lg="3"
          class="d-flex"
        >
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">{{ stat.label }}</div>
                <div class="text-h4 font-weight-bold mt-1">{{ stat.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ stat.caption }}</div>
              </div>
              <v-avatar :color="stat.color" variant="tonal" rounded="lg">
                <v-icon>{{ stat.icon }}</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-account-cog-outline</v-icon>
          Directorio de usuarios
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <v-text-field
            v-model="search"
            clearable
            prepend-inner-icon="mdi-magnify"
            label="Buscar por nombre, correo, UID o rol"
            class="mb-4"
            variant="outlined"
            density="comfortable"
          />

          <v-data-table
            :headers="headers"
            :items="filteredUsers"
            :items-per-page="10"
            :loading="loading"
            class="card-backgoundcustom admin-users-table"
          >
            <template #no-data>
              <v-empty-state
                headline="No hay usuarios"
                text="Cuando existan perfiles de usuario en Firestore aparecerán aquí."
                icon="mdi-account-search-outline"
              />
            </template>

            <template #item.identity="{ item }">
              <div class="d-flex flex-column">
                <strong>{{ item.nombre || item.email || "Usuario sin nombre" }}</strong>
                <span class="text-caption text-medium-emphasis">{{ item.id }}</span>
              </div>
            </template>

            <template #item.roles="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="role in getDisplayRoles(item)"
                  :key="`${item.id}-${role}`"
                  size="small"
                  :color="roleColor(role)"
                  variant="tonal"
                >
                  {{ getRoleLabel(role) }}
                </v-chip>
              </div>
            </template>

            <template #item.professionalAccessStatus="{ item }">
              <v-chip
                size="small"
                :color="professionalStatusColor(item.professionalAccessStatus)"
                variant="tonal"
              >
                {{ professionalStatusLabel(item.professionalAccessStatus) }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-btn
                  icon="mdi-pencil-outline"
                  size="small"
                  variant="text"
                  color="secondary"
                  aria-label="Editar usuario"
                  class="pf-btn-icon"
                  @click="openEditDialog(item)"
                />
                <v-btn
                  :icon="item.accountStatus === 'disabled' ? 'mdi-account-check-outline' : 'mdi-account-cancel-outline'"
                  size="small"
                  variant="text"
                  :color="item.accountStatus === 'disabled' ? 'success' : 'error'"
                  :aria-label="item.accountStatus === 'disabled' ? 'Reactivar cuenta' : 'Desactivar cuenta'"
                  class="pf-btn-icon"
                  :disabled="item.id === currentUser?.uid"
                  @click="openDeleteDialog(item)"
                />
              </div>
            </template>
          </v-data-table>
          <div v-if="hasMoreUsers" class="d-flex justify-center mt-4">
            <v-btn
              variant="outlined"
              color="secondary"
              class="pf-btn-secondary"
              :loading="loadingMore"
              @click="loadMoreUsers"
            >
              Cargar más usuarios
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-dialog v-model="editDialog" class="bg-transparent" max-width="760">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
            <v-icon color="secondary" size="small">mdi-account-edit-outline</v-icon>
            {{ isCreating ? "Crear perfil de usuario" : "Editar usuario" }}
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4" />
            <v-alert
              v-if="formError"
              class="mb-4"
              color="error"
              variant="tonal"
              icon="mdi-alert-outline"
            >
              {{ formError }}
            </v-alert>
            <v-alert class="mb-4" color="info" variant="tonal" icon="mdi-information-outline">
              El UID debe pertenecer a una cuenta existente de Firebase Authentication.
            </v-alert>

            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="userForm.id"
                  label="UID"
                  :readonly="!isCreating"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.nombre"
                  label="Nombre"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.email"
                  label="Correo"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.fechaNacimiento"
                  label="Fecha de nacimiento"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.telefono"
                  label="Teléfono"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="userForm.roles"
                  label="Roles"
                  :items="roleOptions"
                  item-title="label"
                  item-value="value"
                  chips
                  multiple
                  variant="outlined"
                  density="comfortable"
                >
                  <template #item="{ props, item }">
                    <v-list-item
                      v-bind="props"
                      :subtitle="item.raw.description"
                    />
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="text"
              class="pf-btn-ghost"
              :disabled="savingUser"
              @click="closeEditDialog"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-content-save-outline"
              class="pf-btn-secondary"
              :loading="savingUser"
              :disabled="!canSaveUser"
              @click="saveUser"
            >
              Guardar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="deleteDialog" class="bg-transparent" max-width="520">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            {{ selectedUser?.accountStatus === "disabled" ? "Reactivar cuenta" : "Desactivar cuenta" }}
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4" />
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ selectedUser?.accountStatus === "disabled"
                ? "Se restaurará el acceso a Lurems para"
                : "Se bloqueará el acceso a Firebase Authentication para" }}
              <strong>{{ selectedUser?.email || selectedUser?.nombre || selectedUser?.id }}</strong>.
              Los historiales clínicos y financieros se conservarán para mantener la integridad de auditoría.
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="text"
              class="pf-btn-ghost"
              :disabled="deletingUser"
              @click="deleteDialog = false"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="error"
              variant="tonal"
              :prepend-icon="selectedUser?.accountStatus === 'disabled' ? 'mdi-account-check-outline' : 'mdi-account-cancel-outline'"
              class="pf-btn-destructive"
              :loading="deletingUser"
              @click="deleteSelectedUser"
            >
              {{ selectedUser?.accountStatus === "disabled" ? "Reactivar" : "Desactivar" }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="qaDialog" class="bg-transparent" max-width="620">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
            <v-icon color="secondary">mdi-flask-outline</v-icon>
            Preparar cuentas QA
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4" />
            <v-alert color="warning" variant="tonal" icon="mdi-alert-outline" class="mb-4">
              Esta acción solo funciona si tu UID está autorizado en la configuración del backend.
              Las cuentas serán visibles únicamente para tu sesión administrativa.
            </v-alert>
            <v-text-field
              v-model="qaTemporaryPassword"
              label="Contraseña temporal compartida"
              type="password"
              autocomplete="new-password"
              hint="Mínimo 12 caracteres. No se guarda en Firestore ni en logs."
              persistent-hint
            />
            <v-alert v-if="qaError" color="error" variant="tonal" class="mt-4">
              {{ qaError }}
            </v-alert>
            <v-list v-if="qaAccounts.length" class="bg-transparent mt-4">
              <v-list-item
                v-for="account in qaAccounts"
                :key="account.uid"
                :title="account.email"
                :subtitle="account.therapistId || 'Paciente de prueba'"
              />
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" class="pf-btn-ghost" @click="qaDialog = false">Cerrar</v-btn>
            <v-btn
              color="secondary"
              class="pf-btn-primary"
              :loading="seedingQa"
              :disabled="qaTemporaryPassword.length < 12"
              @click="seedQaAccounts"
            >
              Crear o actualizar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAppContextStore } from "@/store/appContext";
import { useAuthStore } from "@/store/auth";
import {
  getUsers,
  seedQaMarketplaceData,
  setUserAccountStatusByAdmin,
  upsertUserByAdmin,
} from "@/services/userService";
import {
  APP_ROLES,
  ROLE_OPTIONS,
  getRoleLabel,
  getUserRoles,
} from "@/utils/roles";

const appContext = useAppContextStore();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);

const users = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const search = ref("");
const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedUser = ref(null);
const isCreating = ref(false);
const savingUser = ref(false);
const deletingUser = ref(false);
const formError = ref("");
const nextUsersCursor = ref("");
const hasMoreUsers = ref(false);
const loadingMore = ref(false);
const qaDialog = ref(false);
const qaTemporaryPassword = ref("");
const qaAccounts = ref([]);
const qaError = ref("");
const seedingQa = ref(false);

const roleOptions = ROLE_OPTIONS;

const userForm = reactive({
  id: "",
  nombre: "",
  email: "",
  fechaNacimiento: "",
  telefono: "",
  roles: [APP_ROLES.PATIENT],
});

const headers = [
  { title: "Usuario", key: "identity", sortable: false },
  { title: "Correo", value: "email" },
  { title: "Roles", key: "roles", sortable: false },
  { title: "Acceso profesional", value: "professionalAccessStatus" },
  { title: "Acciones", key: "actions", sortable: false },
];

const filteredUsers = computed(() => {
  const q = search.value.toString().trim().toLowerCase();

  if (!q) {
    return users.value;
  }

  return users.value.filter((user) =>
    [
      user.id,
      user.nombre,
      user.email,
      getDisplayRoles(user).map(getRoleLabel).join(" "),
      user.professionalAccessStatus,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
});

const stats = computed(() => [
  {
    label: "Usuarios",
    value: users.value.length,
    caption: "Perfiles Firestore",
    icon: "mdi-account-group-outline",
    color: "secondary",
  },
  {
    label: "Pacientes",
    value: countRole(APP_ROLES.PATIENT),
    caption: "Con rol paciente",
    icon: "mdi-account-heart-outline",
    color: "success",
  },
  {
    label: "Psicólogos",
    value: countRole(APP_ROLES.PSYCHOLOGIST),
    caption: "Con rol profesional",
    icon: "mdi-account-tie-outline",
    color: "primary",
  },
  {
    label: "Admins",
    value: countRole(APP_ROLES.ADMIN),
    caption: "Con permisos elevados",
    icon: "mdi-shield-account-outline",
    color: "warning",
  },
]);

const canSaveUser = computed(
  () => userForm.id.trim().length > 0 && userForm.roles.length > 0
);

watch(
  () => appContext.activeMode,
  () => {
    loadUsers();
  },
  { immediate: true }
);

async function loadUsers(options = {}) {
  if (appContext.activeMode !== "admin") {
    users.value = [];
    return;
  }

  const append = Boolean(options.append);
  if (append) loadingMore.value = true;
  else loading.value = true;
  errorMessage.value = "";

  try {
    const result = await getUsers({
      cursor: append ? nextUsersCursor.value : "",
      pageSize: 50,
      force: true,
    });
    users.value = append
      ? [...users.value, ...(result.users || [])]
      : result.users || [];
    nextUsersCursor.value = result.nextCursor || "";
    hasMoreUsers.value = Boolean(result.hasMore);
  } catch (error) {
    console.error("Error loading users:", error);
    errorMessage.value = error?.message || "No pudimos cargar los usuarios.";
    users.value = [];
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function loadMoreUsers() {
  if (!loadingMore.value && hasMoreUsers.value) {
    loadUsers({append: true});
  }
}

function openCreateDialog() {
  isCreating.value = true;
  selectedUser.value = null;
  formError.value = "";
  Object.assign(userForm, {
    id: "",
    nombre: "",
    email: "",
    fechaNacimiento: "",
    telefono: "",
    roles: [APP_ROLES.PATIENT],
  });
  editDialog.value = true;
}

function openEditDialog(user) {
  isCreating.value = false;
  selectedUser.value = user;
  formError.value = "";
  Object.assign(userForm, {
    id: user.id || "",
    nombre: user.nombre || "",
    email: user.email || "",
    fechaNacimiento: user.fechaNacimiento || "",
    telefono: user.telefono || "",
    roles: getDisplayRoles(user),
  });
  editDialog.value = true;
}

function closeEditDialog() {
  editDialog.value = false;
  selectedUser.value = null;
  formError.value = "";
}

async function saveUser() {
  if (!canSaveUser.value || savingUser.value) {
    return;
  }

  const roles = [...userForm.roles];

  if (
    userForm.id === currentUser.value?.uid &&
    !roles.includes(APP_ROLES.ADMIN)
  ) {
    formError.value = "No puedes quitarte tu propio rol admin desde esta vista.";
    return;
  }

  savingUser.value = true;
  formError.value = "";

  try {
    await upsertUserByAdmin(userForm.id.trim(), {
      nombre: userForm.nombre.trim(),
      email: userForm.email.trim(),
      fechaNacimiento: userForm.fechaNacimiento,
      telefono: userForm.telefono.trim(),
      roles,
      includeCreatedAt: isCreating.value,
    });

    if (userForm.id === currentUser.value?.uid) {
      await appContext.loadForUser(userForm.id, { force: true });
    }

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Usuario guardado",
          message: "Los datos y permisos fueron actualizados.",
        },
      })
    );

    closeEditDialog();
    await loadUsers();
  } catch (error) {
    console.error("Error saving user:", error);
    formError.value = error?.message || "No pudimos guardar el usuario.";
  } finally {
    savingUser.value = false;
  }
}

function openDeleteDialog(user) {
  selectedUser.value = user;
  deleteDialog.value = true;
}

async function deleteSelectedUser() {
  if (!selectedUser.value?.id || deletingUser.value) {
    return;
  }

  if (selectedUser.value.id === currentUser.value?.uid) {
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: { message: "No puedes eliminar tu propio perfil admin." },
      })
    );
    deleteDialog.value = false;
    return;
  }

  deletingUser.value = true;

  try {
    const nextStatus = selectedUser.value.accountStatus === "disabled"
      ? "active"
      : "disabled";
    await setUserAccountStatusByAdmin(selectedUser.value.id, nextStatus);
    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: nextStatus === "disabled" ? "Cuenta desactivada" : "Cuenta reactivada",
          message: nextStatus === "disabled"
            ? "El usuario ya no puede iniciar sesión. Sus historiales se conservaron."
            : "El usuario puede volver a iniciar sesión.",
        },
      })
    );
    deleteDialog.value = false;
    selectedUser.value = null;
    await loadUsers();
  } catch (error) {
    console.error("Error deleting user:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No pudimos eliminar el perfil de usuario.",
        },
      })
    );
  } finally {
    deletingUser.value = false;
  }
}

async function seedQaAccounts() {
  if (seedingQa.value || qaTemporaryPassword.value.length < 12) return;
  seedingQa.value = true;
  qaError.value = "";
  try {
    const result = await seedQaMarketplaceData(qaTemporaryPassword.value);
    qaAccounts.value = result.accounts || [];
    qaTemporaryPassword.value = "";
    await loadUsers();
    window.dispatchEvent(new CustomEvent("ui-success", {
      detail: {
        title: "Datos QA preparados",
        message: "Las cuentas, perfiles y horarios de prueba quedaron actualizados.",
      },
    }));
  } catch (error) {
    console.error("Error seeding QA accounts:", error);
    qaError.value = error?.message || "No pudimos preparar las cuentas QA.";
  } finally {
    seedingQa.value = false;
  }
}

function getDisplayRoles(user) {
  return getUserRoles(user, { defaultPatient: true });
}

function countRole(role) {
  return users.value.filter((user) => getDisplayRoles(user).includes(role)).length;
}

function roleColor(role) {
  if (role === APP_ROLES.ADMIN) return "warning";
  if (role === APP_ROLES.PSYCHOLOGIST) return "primary";
  return "success";
}

function professionalStatusLabel(status = "") {
  const normalized = status.toString().trim().toLowerCase();
  if (normalized === "approved") return "Aprobado";
  if (normalized === "rejected") return "Rechazado";
  if (normalized === "pending") return "Pendiente";
  return "No solicitado";
}

function professionalStatusColor(status = "") {
  const normalized = status.toString().trim().toLowerCase();
  if (normalized === "approved") return "success";
  if (normalized === "rejected") return "warning";
  if (normalized === "pending") return "info";
  return "secondary";
}
</script>

<style scoped>
.admin-users-view {
  max-width: 1180px;
}

.admin-users-table {
  border-radius: 8px;
}

</style>
