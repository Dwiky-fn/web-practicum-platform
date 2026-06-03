const { spawn } = require('child_process');
const { writeProjectFiles, getFilesRecursive } = require('../utils/fileUtils');

function runJava({
  code,
  files,
  tempDir,
  mainClass = 'Main',
  onError,
  onSuccess,
  onFail,
}) {
  let projectFiles = files;

  // Backward compatibility:
  // Kalau masih pakai code tunggal, otomatis dianggap Main.java
  if (!Array.isArray(projectFiles) || projectFiles.length === 0) {
    projectFiles = [
      {
        path: 'Main.java',
        content: code || '',
      },
    ];
  }

  try {
    writeProjectFiles(tempDir, projectFiles);
  } catch (error) {
    onFail(error.message);
    return;
  }

  const javaFiles = getFilesRecursive(tempDir, '.java');

  if (javaFiles.length === 0) {
    onFail('Tidak ada file .java yang ditemukan');
    return;
  }

  const compileProcess = spawn('javac', javaFiles, {
    cwd: tempDir,
  });

  compileProcess.stderr.on('data', (data) => {
    onError(data.toString());
  });

  compileProcess.on('error', (error) => {
    onFail(`Gagal menjalankan javac: ${error.message}`);
  });

  compileProcess.on('close', (code) => {
    if (code !== 0) {
      onFail(`Compile failed with code ${code}`);
      return;
    }

    const runProcess = spawn('java', ['-cp', tempDir, mainClass], {
      cwd: tempDir,
    });

    onSuccess(runProcess);
  });
}

module.exports = { runJava };
