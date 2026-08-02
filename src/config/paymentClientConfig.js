const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";
const environment = import.meta.env.VITE_PAYMENT_ENVIRONMENT || "sandbox";
const placeholderMarkers = [
  "REEMPLAZAR",
  "YOUR_",
  "EXAMPLE",
  "PLACEHOLDER",
  "CHANGE_ME",
];

export const paymentClientConfig = Object.freeze({
  provider: import.meta.env.VITE_PAYMENT_PROVIDER || "mercado_pago",
  environment,
  publicKey,
  useFakeProvider:
    import.meta.env.DEV ||
    import.meta.env.VITE_PAYMENT_USE_FAKE_PROVIDER === "true" ||
    placeholderMarkers.some((marker) => publicKey.toUpperCase().includes(marker)),
});

export function assertPaymentClientConfig() {
  if (paymentClientConfig.provider !== "mercado_pago") {
    throw new Error("La configuración del proveedor de pagos no es válida.");
  }
  if (
    import.meta.env.PROD &&
    (paymentClientConfig.useFakeProvider || environment !== "production")
  ) {
    throw new Error("Los pagos no están habilitados en este entorno.");
  }
  return paymentClientConfig;
}
