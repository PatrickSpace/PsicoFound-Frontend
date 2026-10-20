function surveyInputMode(env = process.env) {
  return env.SURVEY_INPUT_MODE === "guided" ? "guided" : "conversational";
}
module.exports = {surveyInputMode};
