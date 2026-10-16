// Payment operations store an authoritative Firestore Timestamp, not a wall date.
export function paymentDeadlineMillis(operation) {
  try {
    const value = operation?.expiresAt?.toMillis?.();
    return Number.isFinite(value) && Number.isFinite(new Date(value).getTime()) ? value : null;
  } catch {
    return null;
  }
}

export function paymentWindow(operation, now = Date.now()) {
  const deadline = paymentDeadlineMillis(operation);
  if (deadline === null) return "unresolved";
  return deadline > now ? "open" : "elapsed";
}
