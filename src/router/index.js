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
import TerapiaDetailView from "@/views/terapias/TerapiaDetailView.vue";
import { auth } from "@/plugins/Firebase/firebase";

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
    },
    {
      path: "/pacientes",
      name: "pacientes",
      component: PacientesView,
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DasboardView,
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
    },
    {
      path: "/sesiones",
      name: "sesiones",
      component: SesionesView,
    },
    {
      path: "/progreso",
      name: "progreso",
      component: ProgresoView,
    },
    {
      path: "/historial",
      name: "historial",
      component: HistorialView,
    },
    {
      path: "/herramientas",
      name: "herramientas",
      component: HerramientasView,
    },
    {
      path: "/terapiadetail",
      name: "terapiadetail",
      component: TerapiaDetailView,
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
});

export default router;
