const { runJava } = require('./javaRunner');
const { runPython } = require('./pythonRunner');

async function runProgram({ language, workspaceDir, entryFile, onStdout, onStderr }) {
  if (language === 'java') {
    return runJava({ workspaceDir, entryFile, onStdout, onStderr });
  }

  if (language === 'python') {
    return runPython({ workspaceDir, entryFile });
  }

  throw new Error('Language belum didukung');
}

module.exports = { runProgram };

