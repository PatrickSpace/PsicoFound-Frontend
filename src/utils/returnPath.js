// Only local application destinations can be carried through legal acceptance.
export function safeReturnPath(value, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://lurems.invalid");
    if (url.origin !== "https://lurems.invalid" ||
        ["/registro", "/login", "/verificar-correo"].includes(url.pathname.replace(/\/$/, ""))) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
