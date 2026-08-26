const ollamaService = require('./ollamaService');
const worldgateService = require('./worldgateService');
const geminiService = require('./geminiService');
const mindrouterService = require('./mindrouterService');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function getActiveProviderName() {
  const provider = (process.env.AI_PROVIDER || 'mindrouter').toLowerCase().trim();
  if (['mindrouter', 'gemini', 'ollama'].includes(provider)) {
    return provider;
  }
  return 'mindrouter';
}

function getActiveProvider() {
  const name = getActiveProviderName();
  switch (name) {
    case 'mindrouter':
      return mindrouterService;
    case 'ollama':
      return ollamaService;
    case 'gemini':
      return geminiService;
    default:
      return mindrouterService;
  }
}

const { estimateTokens } = require('./contextChunkService');

function measureSize(obj) {
  if (obj === undefined || obj === null) return 0;
  if (typeof obj === 'string') return obj.length;
  try {
    return JSON.stringify(obj).length;
  } catch (e) {
    return 0;
  }
}

function instrumentAiRequest(params) {
  const timestamp = new Date().toISOString();
  const systemPrompt = params.systemPrompt || '';
  const userPrompt = params.userPrompt || '';
  
  const systemChars = systemPrompt.length;
  const userChars = userPrompt.length;
  const totalChars = systemChars + userChars;
  const estimatedInputTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);
  
  const meta = params._meta || {};
  const payload = meta.payload || {};
  const isRepair = meta.isRepair || false;
  
  let scope = payload.scope || 'unknown';
  if (isRepair) {
    scope = 'repair';
  }
  
  const attempt = meta.attempt || 1;
  const experimentId = payload.experiment?.experimentId || payload.experiment?.id || null;
  const exerciseId = payload.exercise?.id || null;
  const step = payload.experiment?.step || null;
  const hasContextChunk = Boolean(payload._contextChunk);
  
  let evaluationDataChars = 0;
  const beginMarker = '<BEGIN_EVALUATION_DATA>';
  const endMarker = '<END_EVALUATION_DATA>';
  const beginIdx = userPrompt.indexOf(beginMarker);
  const endIdx = userPrompt.indexOf(endMarker);
  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    evaluationDataChars = userPrompt.substring(beginIdx + beginMarker.length, endIdx).trim().length;
  }

  const jobsheetSize = measureSize(payload.jobsheet);
  const experimentSize = measureSize(payload.experiment);
  const exerciseSize = measureSize(payload.exercise);
  const filesSize = measureSize(payload.experiment?.files || payload.exercise?.files);
  const templateFilesSize = measureSize(payload.experiment?.templateFiles || payload.exercise?.templateFiles);
  const executionSize = measureSize(payload.experiment?.execution || payload.exercise?.execution);
  const rubricSize = measureSize(payload.rubric);
  const contextChunkSize = measureSize(payload._contextChunk);
  const optionsSize = measureSize(payload.options);
  const studentAnalysisSize = measureSize(payload.experiment?.studentAnalysis || payload.exercise?.studentAnalysis);
  const studentConclusionSize = measureSize(payload.studentConclusion);
  const experimentResultsSize = measureSize(payload.experimentResults);
  const exerciseResultsSize = measureSize(payload.exerciseResults);

  let invalidOutputSize = 0;
  let validationErrorsSize = 0;
  if (isRepair) {
    invalidOutputSize = measureSize(meta.lastOutput);
    validationErrorsSize = measureSize(meta.lastErrors);
  }

  console.log(`\n[AI_REQUEST]`);
  console.log(`timestamp=${timestamp}`);
  console.log(`requestId=${params.requestId || payload.requestId || 'unknown'}`);
  console.log(`scope=${scope}`);
  console.log(`attempt=${attempt}`);
  console.log(`experimentId=${experimentId || '-'}`);
  console.log(`exerciseId=${exerciseId || '-'}`);
  console.log(`step=${step !== null ? step : '-'}`);
  console.log(`hasContextChunk=${hasContextChunk}`);
  console.log(`systemChars=${systemChars}`);
  console.log(`userChars=${userChars}`);
  console.log(`totalChars=${totalChars}`);
  console.log(`evaluationDataChars=${evaluationDataChars}`);
  console.log(`estimatedInputTokens=${estimatedInputTokens}`);
  console.log(`estimationMethod=Math.ceil(length / 4)`);
  console.log(`BREAKDOWN_SIZES: jobsheet=${jobsheetSize}, experiment=${experimentSize}, exercise=${exerciseSize}, files=${filesSize}, templateFiles=${templateFilesSize}, execution=${executionSize}, rubric=${rubricSize}, contextChunk=${contextChunkSize}, options=${optionsSize}, studentAnalysis=${studentAnalysisSize}, studentConclusion=${studentConclusionSize}, experimentResults=${experimentResultsSize}, exerciseResults=${exerciseResultsSize}, invalidOutput=${invalidOutputSize}, validationErrors=${validationErrorsSize}`);
  console.log(`[END_AI_REQUEST]\n`);
}

async function generateJsonText(params) {
  const providerName = getActiveProviderName();
  const provider = getActiveProvider();

  instrumentAiRequest(params);

  logger.info(`[AI Provider] Directing evaluation request to provider '${providerName}'`, { requestId: params.requestId });
  return provider.generateJsonText(params);
}

async function checkProviderHealth() {
  const providerName = getActiveProviderName();

  let result;
  if (providerName === 'mindrouter') {
    result = await mindrouterService.checkMindRouterHealth();
  } else if (providerName === 'gemini') {
    result = await geminiService.checkGeminiHealth();
  } else if (providerName === 'worldgate') {
    result = await worldgateService.checkWorldGateHealth();
  } else {
    result = await ollamaService.checkOllamaHealth();
  }

  return {
    provider: providerName,
    ...result,
  };
}

module.exports = {
  generateJsonText,
  checkProviderHealth,
  getActiveProviderName,
  getActiveProvider,
  mindrouterService,
  ollamaService,
  worldgateService,
  geminiService,
};
