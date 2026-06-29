export function isPermissionDeniedError(error) {
  const code = (error?.code || "").toString().toLowerCase();
  const message = (error?.message || "").toString().toLowerCase();

  return (
    code.includes("permission-denied") ||
    message.includes("missing or insufficient permissions")
  );
}

export function getPermissionAwareMessage(error, fallbackMessage) {
  if (isPermissionDeniedError(error)) {
    return "Esta informacion requiere actualizar las reglas de Firestore antes de estar disponible.";
  }

  return error?.message || fallbackMessage;
}
