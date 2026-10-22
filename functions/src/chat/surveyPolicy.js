function surveyInputMode(env = process.env) {
  const configured = (env.SURVEY_INPUT_MODE || "hybrid").toLowerCase();
  return ["guided", "conversational", "hybrid"].includes(configured) ?
    configured : "hybrid";
}
module.exports = {surveyInputMode};
