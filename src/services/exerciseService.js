import { callFollowup, getItemsForTherapies } from "@/services/followupService";
import { getTherapiesByPatient } from "@/services/terapiaService";

export const createExercise = (data) => callFollowup("assignFollowupExercise", data);
export const completeExercise = (data) => callFollowup("completeFollowupExercise", data);
export const getExercisesForTherapies = (therapies) => getItemsForTherapies("exercises", therapies);
export async function getExercisesByPatient(uid) {
  return uid ? getExercisesForTherapies(await getTherapiesByPatient(uid)) : [];
}
