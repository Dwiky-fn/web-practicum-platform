const { spawn } = require('child_process');
const { resolveInsideBase, sanitizeRelativePath } = require('../utils/pathSecurity');

function getPythonCommand() {
  if (process.platform === 'win32') {
    return {
      command: 'py',
      args: ['-3', '-u'],
    };
  }

  return {
    command: 'python3',
    args: ['-u'],
  };
}

async function runPython({ workspaceDir, entryFile }) {
  if (!entryFile || !entryFile.endsWith('.py')) {
    throw new Error('entryFile Python harus berupa file .py');
  }

  const safeEntryFile = sanitizeRelativePath(entryFile);
  resolveInsideBase(workspaceDir, safeEntryFile);

  const { command, args } = getPythonCommand();

  return spawn(command, [...args, safeEntryFile], {
    cwd: workspaceDir,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      PYTHONPATH: workspaceDir,
    },
    shell: false,
  });
}

module.exports = { runPython };

