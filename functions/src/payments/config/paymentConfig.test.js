const test = require("node:test");
const assert = require("node:assert/strict");
const {getPaymentConfig} = require("./paymentConfig");

test("allows fake provider in development", () => {
  const config = getPaymentConfig({
    APP_ENVIRONMENT: "development",
    PAYMENT_ENVIRONMENT: "sandbox",
    PAYMENT_USE_FAKE_PROVIDER: "true",
  });
  assert.equal(config.useFakeProvider, true);
  assert.equal(config.currency, "PEN");
});

test("blocks fake provider in production", () => {
  assert.throws(
      () =>
        getPaymentConfig({
          APP_ENVIRONMENT: "production",
          PAYMENT_ENVIRONMENT: "production",
          PAYMENT_USE_FAKE_PROVIDER: "true",
        }),
      /PAYMENT_CONFIGURATION_INVALID/,
  );
});

test("blocks placeholders and localhost in production", () => {
  assert.throws(
      () =>
        getPaymentConfig({
          APP_ENVIRONMENT: "production",
          PAYMENT_ENVIRONMENT: "production",
          PAYMENT_USE_FAKE_PROVIDER: "false",
          MERCADO_PAGO_ACCESS_TOKEN: "REEMPLAZAR",
          MERCADO_PAGO_CLIENT_SECRET: "REEMPLAZAR",
          MERCADO_PAGO_WEBHOOK_SECRET: "REEMPLAZAR",
          MERCADO_PAGO_CLIENT_ID: "REEMPLAZAR",
          PAYMENT_TOKEN_ENCRYPTION_KEY: "REEMPLAZAR",
          MERCADO_PAGO_OAUTH_REDIRECT_URI: "http://localhost/callback",
          MERCADO_PAGO_WEBHOOK_URL: "http://localhost/webhook",
        }),
      /PAYMENT_CONFIGURATION_INVALID/,
  );
});

test("blocks percentages that do not sum 100", () => {
  assert.throws(
      () =>
        getPaymentConfig({
          DEFAULT_PLATFORM_COMMISSION_PERCENTAGE: "35",
          DEFAULT_PSYCHOLOGIST_PERCENTAGE: "70",
        }),
      /PAYMENT_PERCENTAGES/,
  );
});

test("requires live Culqi keys and encryption in production", () => {
  assert.throws(
      () =>
        getPaymentConfig({
          PAYMENT_PROVIDER: "culqi",
          APP_ENVIRONMENT: "production",
          PAYMENT_ENVIRONMENT: "production",
          PAYMENT_USE_FAKE_PROVIDER: "false",
          CULQI_PUBLIC_KEY: "pk_test_not_live",
          CULQI_SECRET_KEY: "sk_test_not_live",
          PAYMENT_TOKEN_ENCRYPTION_KEY: "a-real-key",
        }),
      /CULQI_PUBLIC_KEY|CULQI_SECRET_KEY/,
  );
  const config = getPaymentConfig({
    PAYMENT_PROVIDER: "culqi",
    APP_ENVIRONMENT: "production",
    PAYMENT_ENVIRONMENT: "production",
    PAYMENT_USE_FAKE_PROVIDER: "false",
    CULQI_PUBLIC_KEY: "pk_live_valid",
    CULQI_SECRET_KEY: "sk_live_valid",
    PAYMENT_TOKEN_ENCRYPTION_KEY: "a-real-key",
  });
  assert.equal(config.provider, "culqi");
});
