function normalizeJavaMainClass(sourceCode) {
  return sourceCode.replace(
    /\bpublic\s+class\s+([A-Za-z_$][\w$]*)\b/,
    (match, className) => {
      if (className === 'Main') return match;
      return match.replace(className, 'Main');
    },
  );
}

class Judge0RunnerService {
  constructor(judge0Service) {
    this._judge0Service = judge0Service;
  }

  async run({ source_code, language_id, stdin }) {
    const normalizedSourceCode =
      Number(language_id) === 62
        ? normalizeJavaMainClass(source_code)
        : source_code;

    return await this._judge0Service.runCode({
      source_code: normalizedSourceCode,
      language_id,
      stdin,
    });
  }
}

module.exports = Judge0RunnerService;
