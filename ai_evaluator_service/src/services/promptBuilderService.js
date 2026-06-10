const systemPrompt = require('../prompts/systemPrompt');
const buildExperimentPrompt = require('../prompts/experimentPrompt');
const buildJobsheetPrompt = require('../prompts/jobsheetPrompt');
const buildRepairJsonPrompt = require('../prompts/repairJsonPrompt');

function buildEvaluationPrompt(payload) {
  if (payload.scope === 'experiment') {
    return {
      systemPrompt,
      userPrompt: buildExperimentPrompt(payload),
    };
  }

  if (payload.scope === 'jobsheet') {
    return {
      systemPrompt,
      userPrompt: buildJobsheetPrompt(payload),
    };
  }

  throw new Error(`Scope tidak didukung: ${payload.scope}`);
}

function buildRepairPrompt(options) {
  return {
    systemPrompt,
    userPrompt: buildRepairJsonPrompt(options),
  };
}

module.exports = {
  buildEvaluationPrompt,
  buildRepairPrompt,
};
