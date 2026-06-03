const { runPython } = require('./pythonRunner');
const { runJava } = require('./javaRunner');

function runCode({
  language,
  code,
  files,
  mainClass,
  entryFile,
  tempDir,
  onError,
  onSuccess,
  onFail,
}) {
  if (language === 'python') {
    runPython({
      code,
      files,
      tempDir,
      entryFile,
      onSuccess,
      onFail,
    });
    return;
  }

  if (language === 'java') {
    runJava({
      code,
      files,
      tempDir,
      mainClass,
      onError,
      onSuccess,
      onFail,
    });
    return;
  }

  onFail('Language belum didukung');
}

module.exports = { runCode };
