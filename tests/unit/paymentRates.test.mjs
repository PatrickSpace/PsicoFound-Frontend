import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmountMinor, previewPaymentSplit, isMercadoPagoLink, formatPaymentAmount } from "../../src/utils/paymentRates.js";

test("parses decimal soles without losing cents", () => {
  for (const [value, expected] of [["110", 11000], ["120", 12000], ["1.1", 110], ["1,10", 110], ["0.01", 1], ["100000", 10000000]]) {
    assert.equal(parseAmountMinor(value), expected);
  }
  for (const value of [null, "", "-1", "0", "1.001", "1e2", "100000.01", "S/110", "1,000.00"]) {
    assert.equal(parseAmountMinor(value), null);
  }
});

test("preview distributes the whole amount, including odd cents", () => {
  for (const amount of [1, 2, 110, 11000, 12000, 10000000]) {
    const split = previewPaymentSplit(amount);
    assert.equal(split.psychologistAmountMinor, Math.round(amount * .7));
    assert.equal(split.platformAmountMinor + split.psychologistAmountMinor, amount);
  }
  assert.equal(previewPaymentSplit(null), null);
  assert.equal(previewPaymentSplit(1.1), null);
  assert.equal(formatPaymentAmount(undefined), "Sin tarifa");
  assert.match(formatPaymentAmount(110), /1[.,]10/);
});

test("only accepts usable HTTPS links on approved hosts", () => {
  assert.equal(isMercadoPagoLink("https://mpago.la/prueba"), true);
  assert.equal(isMercadoPagoLink("https://www.mercadopago.com.pe/checkout/v1?pref_id=test"), true);
  for (const url of [null, "", "http://mpago.la/a", "https://mpago.la.evil.test/a", "https://mpago.la/", "javascript:alert(1)", "https://user:pass@mpago.la/a", "https://mpago.la:123/a", "https://mpago.la/a#secret"]) {
    assert.equal(isMercadoPagoLink(url), false, String(url));
  }
});
