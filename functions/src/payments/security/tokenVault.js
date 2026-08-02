const crypto = require("node:crypto");

function encryptToken(value, keyMaterial) {
  if (!value) return null;
  const key = deriveKey(keyMaterial);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptToken(payload, keyMaterial) {
  if (!payload?.ciphertext) return "";
  const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      deriveKey(keyMaterial),
      Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function deriveKey(value) {
  if (!value) {
    const error = new Error("PAYMENT_CONFIGURATION_INVALID: token encryption key missing");
    error.code = "PAYMENT_CONFIGURATION_INVALID";
    throw error;
  }
  return crypto.createHash("sha256").update(String(value)).digest();
}

module.exports = {decryptToken, encryptToken};
