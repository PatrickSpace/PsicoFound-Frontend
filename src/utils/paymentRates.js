export function parseAmountMinor(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return amount > 0 && amount <= 10000000 ? amount : null;
}

export function formatPaymentAmount(amountMinor) {
  if (!Number.isSafeInteger(amountMinor)) return "Sin tarifa";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amountMinor / 100);
}

export function previewPaymentSplit(amountMinor) {
  if (!Number.isSafeInteger(amountMinor)) return null;
  const psychologistAmountMinor = Math.round(amountMinor * 70 / 100);
  return {
    psychologistAmountMinor,
    platformAmountMinor: amountMinor - psychologistAmountMinor,
  };
}

export function isMercadoPagoLink(value) {
  try {
    const url = new URL(value.trim());
    return value.length <= 2048 && url.protocol === "https:" &&
      ["mpago.la", "mercadopago.com.pe", "www.mercadopago.com.pe"].includes(url.hostname) &&
      !url.username && !url.password && !url.port && !url.hash && url.pathname !== "/";
  } catch {
    return false;
  }
}
