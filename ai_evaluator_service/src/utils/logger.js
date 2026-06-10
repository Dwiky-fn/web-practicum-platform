const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level) {
  const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  const minimumPriority = LEVEL_PRIORITY[configuredLevel] || LEVEL_PRIORITY.info;
  return LEVEL_PRIORITY[level] >= minimumPriority;
}

function write(level, message, metadata = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeMetadata(metadata),
  };

  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
}

function sanitizeMetadata(metadata) {
  const forbiddenKeys = new Set([
    'sourceCode',
    'prompt',
    'password',
    'token',
    'apiKey',
    'email',
    'nim',
  ]);

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !forbiddenKeys.has(key)),
  );
}

module.exports = {
  debug(message, metadata) {
    write('debug', message, metadata);
  },
  info(message, metadata) {
    write('info', message, metadata);
  },
  warn(message, metadata) {
    write('warn', message, metadata);
  },
  error(message, metadata) {
    write('error', message, metadata);
  },
};
