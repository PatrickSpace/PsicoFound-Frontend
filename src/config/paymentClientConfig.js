const provider = import.meta.env.VITE_PAYMENT_PROVIDER || "culqi";
const publicKey = provider === "culqi" ?
  import.meta.env.VITE_CULQI_PUBLIC_KEY || "" :
  import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";
const environment = import.meta.env.VITE_PAYMENT_ENVIRONMENT || "sandbox";
const placeholderMarkers = [
  "REEMPLAZAR",
  "YOUR_",
  "EXAMPLE",
  "PLACEHOLDER",
  "CHANGE_ME",
];

export const paymentClientConfig = Object.freeze({
  provider,
  environment,
  publicKey,
  useFakeProvider:
    import.meta.env.DEV ||
    import.meta.env.VITE_PAYMENT_USE_FAKE_PROVIDER === "true" ||
    placeholderMarkers.some((marker) => publicKey.toUpperCase().includes(marker)),
});

export function assertPaymentClientConfig() {
  if (!["culqi", "mercado_pago"].includes(paymentClientConfig.provider)) {
    throw new Error("La configuración del proveedor de pagos no es válida.");
  }
  if (
    import.meta.env.PROD &&
    (paymentClientConfig.useFakeProvider || environment !== "production")
  ) {
    throw new Error("Los pagos no están habilitados en este entorno.");
  }
  if (provider === "culqi" && !paymentClientConfig.useFakeProvider &&
    !publicKey.startsWith(environment === "production" ? "pk_live_" : "pk_test_")) {
    throw new Error("La llave pública de Culqi no está configurada.");
  }
  return paymentClientConfig;
}

// Existing deployments keep the current checkout until a provider is configured.
export const automatedPaymentsEnabled = import.meta.env.VITE_AUTOMATED_PAYMENTS_ENABLED === "true" && Boolean(
  (import.meta.env.VITE_PAYMENT_PROVIDER && publicKey &&
    !placeholderMarkers.some(marker => publicKey.toUpperCase().includes(marker))) ||
  (import.meta.env.DEV && import.meta.env.VITE_PAYMENT_USE_FAKE_PROVIDER === "true")
);
