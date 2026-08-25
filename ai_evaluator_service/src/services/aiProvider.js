const ollamaService = require('./ollamaService');
const worldgateService = require('./worldgateService');
const geminiService = require('./geminiService');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

function getActiveProviderName() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  if (['gemini', 'worldgate', 'ollama'].includes(provider)) {
    return provider;
  }
  return 'gemini';
}

function getActiveProvider() {
  const name = getActiveProviderName();
  switch (name) {
    case 'worldgate':
      return worldgateService;
    case 'ollama':
      return ollamaService;
    case 'gemini':
    default:
      return geminiService;
  }
}

async function generateJsonText(params) {
  const providerName = getActiveProviderName();
  const provider = getActiveProvider();

  logger.info(`[AI Provider] Directing evaluation request to provider '${providerName}'`, { requestId: params.requestId });
  return provider.generateJsonText(params);
}

async function checkProviderHealth() {
  const providerName = getActiveProviderName();
  const provider = getActiveProvider();

  let result;
  if (providerName === 'gemini') {
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
  ollamaService,
  worldgateService,
  geminiService,
};
