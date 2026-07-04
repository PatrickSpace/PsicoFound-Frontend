import { defineStore } from "pinia";
import { ref } from "vue";
import { therapistGradients } from "@/plugins/theme/tokens";

export const useTerapiaStore = defineStore("terapia", () => {
  // criterios de búsqueda (estado)
  const especialidades = ref([])      // array de ids/títulos seleccionados
  const enfoque = ref("")            // string (ej. 'Humanista')
  const genero = ref("")             // 'masculino' | 'femenino' | ''
  const modalidad = ref("")          // 'presencial' | 'remota' | 'hibrida' | ''
  const preferencia_edad_min = ref(0)
  const preferencia_edad_max = ref(0)
  const topterapeutas = ref([])          // resultados de la última búsqueda

  // selección actual (opcional)
  const terapia = ref(null)

  function setTerapia(newTerapia) {
    terapia.value = newTerapia
  }

  function resetCriterios() {
    especialidades.value = []
    enfoque.value = ""
    genero.value = ""
    modalidad.value = ""
    preferencia_edad_min.value = 0
    preferencia_edad_max.value = 0
  }

  function getTopTerapeutas() {
    return topterapeutas.value;
  }

  function setTopTerapeutas(items = []) {
    topterapeutas.value = Array.isArray(items) ? items : []
  }

  function normalizarEspecialidades(valores = []) {
    return (Array.isArray(valores) ? valores : [])
      .map((item) => {
        if (typeof item === "string") return item
        if (item?.title) return item.title
        return ""
      })
      .filter(Boolean)
  }

  function normalizarGenero(valor) {
    const normalized = (valor || "").toString().trim().toLowerCase()

    if (normalized === "hombre") return "masculino"
    if (normalized === "mujer") return "femenino"
    if (normalized === "me es indiferente") return ""

    return normalized
  }

  function normalizarModalidad(valor) {
    const normalized = (valor || "").toString().trim().toLowerCase()

    if (normalized === "me es indiferente") return ""
    if (normalized === "online" || normalized === "remota" || normalized === "remoto") return "remoto"
    if (normalized === "presencial" || normalized === "precencial") return "presencial"
    if (
      normalized === "hibrida" ||
      normalized === "hiibrido" ||
      normalized === "híbrida" ||
      normalized === "hibrido" ||
      normalized === "híbrido"
    ) return "hibrido"

    return normalized
  }

  function aplicarPreferenciaEdad(valor) {
    const normalized = (valor || "").toString().trim()

    preferencia_edad_min.value = 0
    preferencia_edad_max.value = 0

    if (normalized === "25-35") {
      preferencia_edad_min.value = 25
      preferencia_edad_max.value = 35
    } else if (normalized === "35-45") {
      preferencia_edad_min.value = 35
      preferencia_edad_max.value = 45
    } else if (normalized === "+ 45" || normalized === "+45") {
      preferencia_edad_min.value = 45
    }
  }

  function setCriteriosBusqueda({ especialidades: nuevasEspecialidades = [], enfoque: nuevoEnfoque = "", genero: nuevoGenero = "", modalidad: nuevaModalidad = "", edad = "" } = {}) {
    especialidades.value = normalizarEspecialidades(nuevasEspecialidades)
    enfoque.value = (nuevoEnfoque || "").toString().trim()
    genero.value = normalizarGenero(nuevoGenero)
    modalidad.value = normalizarModalidad(nuevaModalidad)
    aplicarPreferenciaEdad(edad)
  }
  function buscarterapeutaejemplo() {
    // Ejemplo predeterminado basado en el terapeuta id:1 (María González)
    especialidades.value = ["Ansiedad"]
    enfoque.value = "Humanista"
    genero.value = "femenino"
    modalidad.value = "online"
    preferencia_edad_min.value = 30
    preferencia_edad_max.value = 40

    const resultado = buscarterapeutas(terapeutasEjemplo);
    topterapeutas.value = resultado;
    console.log("Terapeutas encontrados:", topterapeutas.value);
    
  }

  /**
   * Buscar terapeutas según criterios del store.
   * allTherapeutas: lista completa de terapeutas (cada uno:
   *   { especialidades: [], enfoques: [], genero, edad, modalidad (o modalidades:[]) }
   * Devuelve array filtrado y ordenado por score de coincidencia.
   */
  function buscarterapeutas(allTherapeutas = []) {
    // Normalizar criterios
    const reqEspecialidades = Array.isArray(especialidades.value) ? especialidades.value.filter(Boolean) : []
    const reqEnfoque = (enfoque.value || "").toString().trim().toLowerCase()
    const reqGenero = (genero.value || "").toString().trim().toLowerCase()
    const reqModalidad = (modalidad.value || "").toString().trim().toLowerCase()
    const minEdad = Number(preferencia_edad_min.value) || 0
    const maxEdad = Number(preferencia_edad_max.value) || 0

    // Si no hay terapeutas, devolver vacío
    if (!Array.isArray(allTherapeutas) || allTherapeutas.length === 0) return []

    // Funcion auxiliar para normalizar arrays a lower-case strings
    const normalizeArray = (arr) =>
      (Array.isArray(arr) ? arr : []).map((s) => (s || "").toString().toLowerCase())

    const results = allTherapeutas
      .map((t) => {
        let score = 0
        // especialidades: contar coincidencias (si se seleccionaron)
        const tEspecialidades = normalizeArray(t.especialidades)
        if (reqEspecialidades.length > 0) {
          const matches = reqEspecialidades
            .map((e) => e.toString().toLowerCase())
            .filter((req) => tEspecialidades.includes(req))
          score += matches.length // más coincidencias => mayor score
        } else {
          // si no se especificó, no penalizar
          score += 0
        }

        // enfoque: si el terapeuta tiene uno o varios enfoques
        const tEnfoques = normalizeArray(t.enfoques || t.enfoque)
        if (reqEnfoque) {
          if (tEnfoques.includes(reqEnfoque)) score += 2
        }

        // genero: coincidencia exacta
        const tGenero = (t.genero || "").toString().toLowerCase()
        if (reqGenero) {
          if (tGenero === reqGenero) score += 1
        }

        // modalidad: permitir que terapeuta tenga modalidad simple o array
        const tModalidades = normalizeArray(t.modalidades || t.modalidad).map(normalizarModalidad)
        if (reqModalidad) {
          if (tModalidades.includes(reqModalidad)) score += 1
        }

        // edad: comprobar rango si ambos límites definidos (>0)
        const tEdad = Number(t.edad) || 0
        if (minEdad > 0 || maxEdad > 0) {
          const minOk = minEdad > 0 ? tEdad >= minEdad : true
          const maxOk = maxEdad > 0 ? tEdad <= maxEdad : true
          if (minOk && maxOk) score += 1
        }
       // console.log(`Terapeuta: ${t.nombre}, Score: ${score}`);
        return { terapeuta: t, score }
      })
      // Filtrar: si no hay criterios activos, devolver todos; si hay criterios, devolver los con score>0
      .filter(({ score }) => {
        const anyCriterion =
          reqEspecialidades.length > 0 ||
          !!reqEnfoque ||
          !!reqGenero ||
          !!reqModalidad ||
          minEdad > 0 ||
          maxEdad > 0
        return anyCriterion ? score > 0 : true
      })
      // Ordenar por score descendente (más relevante primero)
      .sort((a, b) => b.score - a.score)
      // <-- limitar a los 5 primeros puestos según score
      .slice(0, 5)
      // devolver solo objetos de terapeuta (sin score)
      .map((r) => r.terapeuta)

    return results
  }

  return {
    especialidades,
    enfoque,
    genero,
    modalidad,
    preferencia_edad_min,
    preferencia_edad_max,
    terapia,
    setTerapia,
    buscarterapeutas,
    buscarterapeutaejemplo,
    getTopTerapeutas,
    setTopTerapeutas,
    setCriteriosBusqueda,
  }
})

const terapeutasEjemplo = [
  {
    id: 1,
    nombre: "María González",
    especialidades: ["Ansiedad", "Depresión"],
    enfoques: ["Humanista", "Cognitivo-Conductual"],
    genero: "femenino",
    edad: 34,
    modalidad: "online",
    description: "Trabaja con técnicas humanistas y cognitivo-conductuales para ansiedad y depresión.",
    mensaje: "Mi enfoque combina escucha empática y herramientas prácticas para recuperar equilibrio.",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    gradient: therapistGradients[0]
  },
  {
    id: 2,
    nombre: "Carlos Ramírez",
    especialidades: ["Trauma infantil", "Problemas de autoestima"],
    enfoques: ["Psicoanálisis"],
    genero: "masculino",
    edad: 45,
    modalidades: ["presencial", "hibrida"],
    description: "Especialista en procesos de trauma y fortalecimiento de la autoestima.",
    mensaje: "Acompaño procesos profundos con respeto y trabajo reflexivo.",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    gradient: therapistGradients[1]
  },
  {
    id: 3,
    nombre: "Lucía Fernández",
    especialidades: ["Problemas de pareja", "Ansiedad social"],
    enfoques: ["Terapia Familiar", "Humanista"],
    genero: "femenino",
    edad: 39,
    modalidad: "presencial",
    description: "Terapia familiar y de pareja con enfoque humanista y práctico.",
    mensaje: "Trabajo desde la conexión y la comunicación consciente entre las personas.",
    avatar: "https://randomuser.me/api/portraits/women/55.jpg",
    gradient: therapistGradients[2]
  },
  {
    id: 4,
    nombre: "Diego Ortiz",
    especialidades: ["Abuso de sustancias", "Depresión"],
    enfoques: ["Cognitivo-Conductual", "Integrativo"],
    genero: "masculino",
    edad: 50,
    modalidades: ["remota", "hibrida"],
    description: "Intervención en adicciones y depresión con técnicas integrativas.",
    mensaje: "Mi objetivo es ofrecer rutas concretas hacia la recuperación y bienestar.",
    avatar: "https://randomuser.me/api/portraits/men/47.jpg",
    gradient: therapistGradients[3]
  },
  {
    id: 5,
    nombre: "Ana Morales",
    especialidades: ["Problemas laborales", "Procrastinación"],
    enfoques: ["Cognitivo-Conductual"],
    genero: "femenino",
    edad: 29,
    modalidad: "online",
    description: "Ayudo a gestionar estrés laboral y hábitos con herramientas CBT.",
    mensaje: "Juntos diseñamos pasos prácticos para mejorar tu rendimiento y bienestar.",
    avatar: "https://randomuser.me/api/portraits/women/22.jpg",
    gradient: therapistGradients[4]
  },
  {
    id: 6,
    nombre: "Javier Castillo",
    especialidades: ["Problemas familiares", "Trauma infantil"],
    enfoques: ["Terapia Familiar", "Humanista"],
    genero: "masculino",
    edad: 41,
    modalidad: "presencial",
    description: "Especializado en dinámicas familiares y acompañamiento a largo plazo.",
    mensaje: "Creo en la resiliencia y en reconstruir vínculos saludables.",
    avatar: "https://randomuser.me/api/portraits/men/15.jpg",
    gradient: therapistGradients[5]
  },
  {
    id: 7,
    nombre: "Sofía Peña",
    especialidades: ["Problemas de identidad", "Ansiedad"],
    enfoques: ["Integrativo", "Humanista"],
    genero: "femenino",
    edad: 33,
    modalidades: ["online", "hibrida"],
    description: "Enfoque integrativo para procesos de identidad y manejo emocional.",
    mensaje: "Acompaño desde la autenticidad para encontrar sentido y claridad.",
    avatar: "https://randomuser.me/api/portraits/women/12.jpg",
    gradient: therapistGradients[6]
  },
  {
    id: 8,
    nombre: "Miguel Torres",
    especialidades: ["Depresión", "Problemas de pareja"],
    enfoques: ["Psicoanálisis", "Cognitivo-Conductual"],
    genero: "masculino",
    edad: 37,
    modalidad: "remota",
    description: "Combina enfoques para abordar depresión y conflictos de pareja.",
    mensaje: "Trabajo en comprender patrones y crear alternativas sostenibles.",
    avatar: "https://randomuser.me/api/portraits/men/5.jpg",
    gradient: therapistGradients[7]
  },
  {
    id: 9,
    nombre: "Carla Vega",
    especialidades: ["Ansiedad social", "Problemas de autoestima"],
    enfoques: ["Humanista"],
    genero: "femenino",
    edad: 27,
    modalidad: "online",
    description: "Terapia breve centrada en habilidades sociales y autoimagen.",
    mensaje: "Pequeños cambios sostenidos generan grandes mejoras en la vida diaria.",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    gradient: therapistGradients[8]
  },
  {
    id: 10,
    nombre: "Roberto Lima",
    especialidades: ["Problemas laborales", "Procrastinación"],
    enfoques: ["Cognitivo-Conductual", "Integrativo"],
    genero: "masculino",
    edad: 48,
    modalidades: ["presencial"],
    description: "Ayuda a mejorar productividad y hábitos desde la psicología aplicada.",
    mensaje: "Diseñamos estrategias para recuperar foco y equilibrio profesional.",
    avatar: "https://randomuser.me/api/portraits/men/21.jpg",
    gradient: therapistGradients[9]
  }
];
