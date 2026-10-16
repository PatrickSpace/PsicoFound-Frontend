import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { zonedDateTimeToDate, appointmentStart } from "../../src/utils/dateTime.js";

const require = createRequire(import.meta.url);
const domain = require("../../functions/src/appointments/appointmentDomain.js");
const cases = [
  ["2027-01-15", "23:30", "America/Lima", "2027-01-16T04:30:00.000Z"],
  ["2027-01-16", "05:30", "Europe/Madrid", "2027-01-16T04:30:00.000Z"],
  ["2027-07-15", "12:00", "Europe/Madrid", "2027-07-15T10:00:00.000Z"],
  ["2027-01-15", "12:00", "Europe/Madrid", "2027-01-15T11:00:00.000Z"],
  ["2027-03-14", "03:30", "America/New_York", "2027-03-14T07:30:00.000Z"],
  ["2027-03-14", "02:30", "America/New_York", null],
  ["2027-11-07", "01:30", "America/New_York", null],
  ["2027-02-30", "12:00", "America/Lima", null],
  ["2027-01-15", "12:00", "Not/AZone", null],
];
for (const [date, time, zone, expected] of cases) {
  test(`IANA frontend/backend parity: ${date} ${time} ${zone}`, () => {
    for (const convert of [zonedDateTimeToDate, domain.zonedDateTimeToDate]) {
      assert.equal(convert(date, time, zone)?.toISOString() || null, expected);
    }
  });
}
test("An explicit instant disambiguates a repeated DST wall time", () => {
  assert.equal(appointmentStart({ startAtIso: "2027-11-07T06:30:00Z",
    fecha: "2027-11-07", hora: "01:30", timeZone: "America/New_York" }).toISOString(),
  "2027-11-07T06:30:00.000Z");
});
