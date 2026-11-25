const {getFirestore} = require("firebase-admin/firestore");

const {requirePatientAccess} = require("../accounts/accessPolicy");
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
    const db = getFirestore();
    if (["mutateAppointment", "cancelAppointment"].includes(method) &&
        request.data?.citaId) {
      const appointment = await db.collection("citas")
          .doc(String(request.data.citaId)).get();
      if (appointment.data()?.pacienteUid === request.auth.uid) {
        await requirePatientAccess(request);
      }
    }
    if (write) {
      await enforceRateLimit({
        db,
        uid: request.auth.uid,
        action: method,
        limit: 20,
        windowMs: 60000,
      });
    }
    return new SchedulingService(db)[method](
        request.auth.uid,
        request.data || {},
    );
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
    new SchedulingService(getFirestore()).sendReminders(),
};
