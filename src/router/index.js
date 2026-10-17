import { createRouter, createWebHistory } from "vue-router";
import { onAuthStateChanged } from "firebase/auth";
const InicioencuestaView = () => import("@/views/encuesta/InicioEncuestaView.vue");
const EncuestaView = () => import("@/views/encuesta/EncuestaView.vue");
const PsicologosView = () => import("@/views/PsicologosView.vue");
const PacientesView = () => import("@/views/PacientesView.vue");
const HomeView = () => import("@/views/Auth/HomeView.vue");
const DasboardView = () => import("@/views/mainviews/DashboardView.vue");
const LogInView = () => import("@/views/Auth/LogIn.vue");
const SignUpview = () => import("@/views/Auth/SingUp.vue");
const VerifyEmailView = () => import("@/views/Auth/VerifyEmailView.vue");
const ElegirTerapeutaView = () => import("@/views/encuesta/ElegirTerapeuta.vue");
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
const PaymentRatesView = () => import("@/views/admin/PaymentRatesView.vue");
const SupportRequestsView = () => import("@/views/admin/SupportRequestsView.vue");
const PaymentOperationsView = () => import("@/views/admin/PaymentOperationsView.vue");
const OnboardingEntryView = () => import("@/views/onboarding/OnboardingEntryView.vue");
const PatientOnboardingView = () => import("@/views/onboarding/PatientOnboardingView.vue");
const PsychologistOnboardingView = () => import("@/views/onboarding/PsychologistOnboardingView.vue");
const PsychologistPendingView = () => import("@/views/onboarding/PsychologistPendingView.vue");
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import { getBlockingOnboardingRoute } from "@/services/onboardingService";

function getCurrentAuthUser() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/privacidad",
      name: "privacy",
      component: () => import("@/views/legal/PublicLegalView.vue"),
      meta: { public: true, legalDocument: true, legalKind: "privacy" },
    },
    {
      path: "/admin/documentos-legales",
      name: "admin-legal-documents",
      component: () => import("@/views/admin/LegalDocumentsView.vue"),
      meta: { modes: ["admin"] },
    },

    {
      path: "/terminos",
      name: "terms",
      component: () => import("@/views/legal/PublicLegalView.vue"),
      meta: { public: true, legalDocument: true, legalKind: "terms" },
    },
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
      meta: { modes: ["psychologist"] },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DasboardView,
      meta: { modes: ["patient"] },
    },
    {
      path: "/login",
      name: "login",
      component: LogInView,
      meta: { public: true, guestOnly: true },
    },
    {
      path: "/verificar-correo",
      name: "verify-email",
      component: VerifyEmailView,
      meta: { emailVerification: true },
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
      meta: { modes: ["patient", "psychologist"] },
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
      path: "/admin/cobros",
      name: "admin-payment-rates",
      component: PaymentRatesView,
      meta: { modes: ["admin"] },
    },
    {
      path: "/admin/soporte",
      name: "admin-support-requests",
      component: SupportRequestsView,
      meta: { modes: ["admin"] },
    },
    {
      path: "/admin/conciliacion",
      name: "admin-payment-operations",
      component: PaymentOperationsView,
      meta: { modes: ["admin"] },
    },
 
]});

router.beforeEach(async (to) => {
  // Legal documents must remain readable before login or email verification.
  if (to.meta.legalDocument) return;
  const user = await getCurrentAuthUser();
  const isPublicRoute = Boolean(to.meta.public);
  const isGuestOnlyRoute = Boolean(to.meta.guestOnly);

  if (!user && !isPublicRoute) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  const usesPassword = user?.providerData?.some(
    (provider) => provider.providerId === "password"
  );
  if (
    user &&
    usesPassword &&
    !user.emailVerified &&
    !to.meta.emailVerification
  ) {
    return {
      path: "/verificar-correo",
      query: { redirect: to.fullPath },
    };
  }

  if (user?.emailVerified && to.meta.emailVerification) {
    return typeof to.query.redirect === "string"
      ? to.query.redirect
      : "/onboarding";
  }

  if (user && isGuestOnlyRoute) {
    return "/onboarding";
  }

  // Verification needs Auth only; profile queries must not delay this screen.
  if (to.meta.emailVerification) return;

  if (user && !isPublicRoute) {
    const appContext = useAppContextStore();
    await appContext.loadForUser(user.uid, { force: true });
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
