import { collection, getDocs } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { callFollowup, getItemsForTherapies } from "@/services/followupService";

export const createTherapyGoal = (data) => callFollowup("createFollowupGoal", data);
export const updateTherapyGoalProgress = ({ goal, progress, note, mode }) =>
  callFollowup("recordGoalProgress", { goalId: goal.id, expectedVersion: goal.version || 0, progress, note, mode });

export async function getGoalsForTherapies(therapies) {
  const goals = await getItemsForTherapies("therapy_goals", therapies);
  return Promise.all(goals.map(async (goal) => {
    const snapshot = await getDocs(collection(db, "therapy_goals", goal.id, "progress"));
    const progressHistory = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => a.version - b.version);
    return { ...goal, progressHistory };
  }));
}
