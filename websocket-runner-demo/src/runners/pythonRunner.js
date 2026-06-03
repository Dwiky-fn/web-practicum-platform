const path = require('path');
const { spawn } = require('child_process');
const {
  writeProjectFiles,
  normalizeProjectPath,
  resolveInsideBase,
} = require('../utils/fileUtils');

function runPython({
  code,
  files,
  tempDir,
  entryFile = 'main.py',
  onSuccess,
  onFail,
}) {
  let projectFiles = files;

  // Backward compatibility:
  // Kalau masih pakai code tunggal, otomatis dianggap main.py
  if (!Array.isArray(projectFiles) || projectFiles.length === 0) {
    projectFiles = [
      {
        path: 'main.py',
        content: code || '',
      },
    ];
  }

  try {
    writeProjectFiles(tempDir, projectFiles);

    const safeEntryFile = normalizeProjectPath(entryFile);
    const entryPath = resolveInsideBase(tempDir, safeEntryFile);

    const pythonProcess = spawn('python', ['-u', entryPath], {
      cwd: tempDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: tempDir,
      },
    });

    onSuccess(pythonProcess);
  } catch (error) {
    onFail(error.message);
  }
}

module.exports = { runPython };
