const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {SchedulingService} = require("./schedulingService");
const {requireAppCheckIfEnabled} = require("../security/appCheck");
const {enforceRateLimit} = require("../security/rateLimit");

function callable(method, write = false) {
  return async (request) => {
    requireAppCheckIfEnabled(request);
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Inicia sesión.");
    }
    const db = admin.firestore();
    if (write) {
      await enforceRateLimit({db, uid: request.auth.uid,
        action: method, limit: 20, windowMs: 60000});
    }
    return new SchedulingService(db)[method](request.auth.uid,
        request.data || {});
  };
}

module.exports = {
  getTherapistCalendar: callable("getCalendar"),
  projectAvailability: callable("project", true),
  listAvailability: callable("listSlots"),
  closeAvailability: callable("closeSlots", true),
  mutateAppointment: callable("mutateAppointment", true),
  cancelAppointment: callable("cancelAppointment", true),
  sendAppointmentReminders: () =>
    new SchedulingService(admin.firestore()).sendReminders(),
};
