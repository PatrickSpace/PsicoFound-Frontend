import { createRouter, createWebHistory } from "vue-router";
import { onAuthStateChanged } from "firebase/auth";
import InicioencuestaView from "@/views/encuesta/InicioEncuestaView.vue";
import EncuestaView from "@/views/encuesta/EncuestaView.vue";
import PsicologosView from "@/views/PsicologosView.vue";
import PacientesView from "@/views/PacientesView.vue";
import HomeView from "@/views/Auth/HomeView.vue";
import DasboardView from "@/views/mainviews/DashboardView.vue";
import LogInView from "@/views/Auth/LogIn.vue";
import SignUpview from "@/views/Auth/SingUp.vue";
import ElegirTerapeutaView from "@/views/encuesta/ElegirTerapeuta.vue";
import SesionesView from "@/views/mainviews/MisSesionesView.vue";
import ProgresoView from "@/views/mainviews/ProgresoView.vue";
import HistorialView from "@/views/mainviews/HistorialView.vue";
import HerramientasView from "@/views/mainviews/HerramientasView.vue";
import ConfiguracionView from "@/views/mainviews/ConfiguracionView.vue";
import TerapiaDetailView from "@/views/terapias/TerapiaDetailView.vue";
import PsicologoSesionesView from "@/views/psicologo/PsicologoSesionesView.vue";
import PsychologistRequestsView from "@/views/admin/PsychologistRequestsView.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";

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
 
]});

router.beforeEach(async (to) => {
  const user = await getCurrentAuthUser();
  const isPublicRoute = Boolean(to.meta.public);
  const isGuestOnlyRoute = Boolean(to.meta.guestOnly);

  if (!user && !isPublicRoute) {
    return {
      path: "/login",
      query: { redirect: to.fullPath },
    };
  }

  if (user && isGuestOnlyRoute) {
    return "/dashboard";
  }

  if (user && !isPublicRoute) {
    const appContext = useAppContextStore();
    await appContext.loadForUser(user.uid);

    const allowedModes = Array.isArray(to.meta.modes) ? to.meta.modes : [];

    if (
      allowedModes.length > 0 &&
      !allowedModes.includes(appContext.activeMode)
    ) {
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
    return "/pacientes";
  }

  return "/dashboard";
}
