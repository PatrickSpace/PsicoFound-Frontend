import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getBlockingOnboardingRoute } from "@/services/onboardingService";
import { getUserById } from "@/services/userService";

const HomeView = () => import("@/views/Auth/HomeView.vue");
const LogInView = () => import("@/views/Auth/LogIn.vue");
const SignUpview = () => import("@/views/Auth/SingUp.vue");
const InicioencuestaView = () => import("@/views/encuesta/InicioEncuestaView.vue");
const EncuestaView = () => import("@/views/encuesta/EncuestaView.vue");
const ElegirTerapeutaView = () => import("@/views/encuesta/ElegirTerapeuta.vue");
const PsicologosView = () => import("@/views/PsicologosView.vue");
const PacientesView = () => import("@/views/PacientesView.vue");
const DasboardView = () => import("@/views/mainviews/DashboardView.vue");
const SesionesView = () => import("@/views/mainviews/MisSesionesView.vue");
const ProgresoView = () => import("@/views/mainviews/ProgresoView.vue");
const RegistroEmocionalView = () => import("@/views/mainviews/RegistroEmocionalView.vue");
const HistorialView = () => import("@/views/mainviews/HistorialView.vue");
const HerramientasView = () => import("@/views/mainviews/HerramientasView.vue");
const ConfiguracionView = () => import("@/views/mainviews/ConfiguracionView.vue");
const TerapiaDetailView = () => import("@/views/terapias/TerapiaDetailView.vue");
const PsicologoSesionesView = () => import("@/views/psicologo/PsicologoSesionesView.vue");
const PsychologistRequestsView = () => import("@/views/admin/PsychologistRequestsView.vue");
const UsersAdminView = () => import("@/views/admin/UsersAdminView.vue");
const OnboardingEntryView = () => import("@/views/onboarding/OnboardingEntryView.vue");
const PatientOnboardingView = () => import("@/views/onboarding/PatientOnboardingView.vue");
const PsychologistOnboardingView = () => import("@/views/onboarding/PsychologistOnboardingView.vue");
const PsychologistPendingView = () => import("@/views/onboarding/PsychologistPendingView.vue");
const TermsView = () => import("@/views/legal/TermsView.vue");
const PrivacyView = () => import("@/views/legal/PrivacyView.vue");
const NotFoundView = () => import("@/views/NotFoundView.vue");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: { public: true },
    },
    {
      path: "/registro",
      name: "registro",
      component: SignUpview,
      meta: { public: true, guestOnly: true },
    },
    {
      path: "/iniciarencuesta",
      name: "Inicioencuesta",
      component: InicioencuestaView,
    },
    {
      path: "/encuesta",
      name: "encuesta",
      component: EncuestaView,
    },
    {
      path: "/psicologos",
      name: "psicologos",
      component: PsicologosView,
      meta: { modes: ["admin"] },
    },
    {
      path: "/pacientes",
      name: "pacientes",
      component: PacientesView,
      meta: { modes: ["psychologist", "admin"] },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DasboardView,
      meta: { modes: ["patient", "admin"] },
    },
    {
      path: "/login",
      name: "login",
      component: LogInView,
      meta: { public: true, guestOnly: true },
    },
    {
      path: "/terminos",
      name: "terms",
      component: TermsView,
      meta: { public: true },
    },
    {
      path: "/privacidad",
      name: "privacy",
      component: PrivacyView,
      meta: { public: true },
    },
    {
      path: "/onboarding",
      name: "onboarding",
      component: OnboardingEntryView,
      meta: { onboarding: true },
    },
    {
      path: "/onboarding/paciente",
      name: "patient-onboarding",
      component: PatientOnboardingView,
      meta: { onboarding: true },
    },
    {
      path: "/onboarding/psicologo",
      name: "psychologist-onboarding",
      component: PsychologistOnboardingView,
      meta: { onboarding: true },
    },
    {
      path: "/onboarding/psicologo/pendiente",
      name: "psychologist-onboarding-pending",
      component: PsychologistPendingView,
      meta: { onboarding: true },
    },
    {
      path: "/elegirterapeuta",
      name: "elegirterapeuta",
      component: ElegirTerapeutaView,
      meta: { modes: ["patient"] },
    },
    {
      path: "/sesiones",
      name: "sesiones",
      component: SesionesView,
      meta: { modes: ["patient"] },
    },
    {
      path: "/progreso",
      name: "progreso",
      component: ProgresoView,
      meta: { modes: ["patient", "psychologist"] },
    },
    {
      path: "/registro-emocional",
      name: "registro-emocional",
      component: RegistroEmocionalView,
      meta: { modes: ["patient", "psychologist"] },
    },
    {
      path: "/historial",
      name: "historial",
      component: HistorialView,
      meta: { modes: ["patient", "psychologist"] },
    },
    {
      path: "/herramientas",
      name: "herramientas",
      component: HerramientasView,
      meta: { modes: ["patient", "psychologist"] },
    },
    {
      path: "/configuracion",
      name: "configuracion",
      component: ConfiguracionView,
      meta: { modes: ["patient", "psychologist", "admin"] },
    },
    {
      path: "/terapiadetail",
      name: "terapiadetail",
      component: TerapiaDetailView,
      meta: { modes: ["patient", "psychologist", "admin"] },
    },
    {
      path: "/psicologo/sesiones",
      name: "psicologo-sesiones",
      component: PsicologoSesionesView,
      meta: { modes: ["psychologist"] },
    },
    {
      path: "/admin/solicitudes-psicologos",
      name: "admin-psychologist-requests",
      component: PsychologistRequestsView,
      meta: { modes: ["admin"] },
    },
    {
      path: "/admin/usuarios",
      name: "admin-users",
      component: UsersAdminView,
      meta: { modes: ["admin"] },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: NotFoundView,
      meta: { public: true },
    },
 
]});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const user = await authStore.waitUntilReady();
  const isPublicRoute = Boolean(to.meta.public);
  const isGuestOnlyRoute = Boolean(to.meta.guestOnly);

  if (!user && !isPublicRoute) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  if (user && isGuestOnlyRoute) {
    if (to.path === "/registro" && to.query.complete === "1") {
      const profile = await getUserById(user.uid, {force: true});
      if (!profile) return;
    }
    return "/onboarding";
  }

  if (user && !isPublicRoute) {
    const appContext = useAppContextStore();
    await appContext.loadForUser(user.uid);
    const blockingOnboardingRoute = getBlockingOnboardingRoute(
      appContext.userProfile || {}
    );

    if (
      blockingOnboardingRoute &&
      !to.meta.onboarding &&
      to.path !== blockingOnboardingRoute
    ) {
      return blockingOnboardingRoute;
    }

    const allowedModes = Array.isArray(to.meta.modes) ? to.meta.modes : [];

    if (
      allowedModes.length > 0 &&
      !allowedModes.includes(appContext.activeMode)
    ) {
      const availableMode = allowedModes.find((mode) =>
        appContext.availableModes.some((item) => item.value === mode)
      );

      if (availableMode) {
        appContext.setActiveMode(availableMode);
        return;
      }

      return defaultRouteForMode(appContext.activeMode);
    }
  }
});

export default router;

function defaultRouteForMode(mode) {
  if (mode === "psychologist") {
    return "/psicologo/sesiones";
  }

  if (mode === "admin") {
    return "/admin/solicitudes-psicologos";
  }

  return "/dashboard";
}
