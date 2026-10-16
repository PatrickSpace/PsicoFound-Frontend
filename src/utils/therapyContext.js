export const isActiveTherapy = (therapy) => therapy?.estado === "activo";

export function therapyLabel(therapy) {
  const created = formatTherapyDate(therapy.fechaCreacion, { dateOnly: true });
  return `${therapy.pacienteNombre || "Paciente"} · ${therapy.id} · ${therapy.estado || "Sin estado"} · Creación: ${created}`;
}

export function formatTherapyDate(value, { dateOnly = false } = {}) {
  // Reject calendar rollovers (e.g. February 30), rather than inventing a date.
  const parts = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (parts) {
    const [, year, month, day] = parts.map(Number);
    if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
      return "Fecha no disponible";
    }
  }
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value ?? "");
    if (!(date instanceof Date) || Number.isNaN(date.getTime()) || typeof value === "boolean") return "Fecha no disponible";
    return dateOnly ? date.toLocaleDateString("es-PE") : date.toLocaleString("es-PE");
  } catch {
    return "Fecha no disponible";
  }
}

export function itemsForContext(items, therapies, mode, uid) {
  const byId = new Map(therapies.map((therapy) => [therapy.id, therapy]));
  return items.filter((item) => {
    const therapy = byId.get(item.terapiaId);
    return therapy && item.pacienteUid === therapy.pacienteUid &&
      item.terapeutaId === therapy.terapeutaId &&
      (mode !== "patient" || item.pacienteUid === uid);
  });
}

export function createRequestGate() {
  let generation = 0;
  return { next: () => ++generation, isCurrent: (ticket) => ticket === generation };
}
