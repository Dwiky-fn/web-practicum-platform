const { send } = require('../utils/send');
const { createTempDir, removeTempDir } = require('../utils/tempDir');
const { runCode } = require('../runners/runnerManager');

function handleSocketConnection(ws) {
  let currentProcess = null;
  let tempDir = null;

  function cleanup() {
    if (currentProcess) {
      currentProcess.kill();
      currentProcess = null;
    }

    if (tempDir) {
      removeTempDir(tempDir);
      tempDir = null;
    }
  }

  function attachProcess(process) {
    currentProcess = process;

    currentProcess.stdout.on('data', (data) => {
      send(ws, 'output', data.toString());
    });

    currentProcess.stderr.on('data', (data) => {
      send(ws, 'error', data.toString());
    });

    currentProcess.on('error', (error) => {
      send(ws, 'error', error.message);
      cleanup();
    });

    currentProcess.on('close', (code) => {
      send(ws, 'exit', `Program exited with code ${code}`);
      cleanup();
    });
  }

  ws.on('message', (message) => {
    let payload;

    try {
      payload = JSON.parse(message.toString());
    } catch {
      send(ws, 'error', 'Format JSON tidak valid');
      return;
    }

    if (payload.type === 'run') {
      cleanup();

      tempDir = createTempDir();

      runCode({
        language: payload.language,
        code: payload.code,
        files: payload.files,
        mainClass: payload.mainClass,
        entryFile: payload.entryFile,
        tempDir,

        onError: (error) => {
          send(ws, 'error', error);
        },

        onFail: (error) => {
          send(ws, 'error', error);
          cleanup();
        },

        onSuccess: (process) => {
          send(ws, 'started', `${payload.language} program started`);
          attachProcess(process);
        },
      });

      return;
    }

    if (payload.type === 'input') {
      if (currentProcess) {
        currentProcess.stdin.write(payload.data ?? payload.value ?? '');
      } else {
        send(ws, 'error', 'Tidak ada program yang sedang berjalan');
      }

      return;
    }

    if (payload.type === 'stop') {
      cleanup();
      send(ws, 'stopped', 'Program stopped');
      return;
    }

    send(ws, 'error', 'Tipe message tidak dikenali');
  });

  ws.on('close', cleanup);
}

module.exports = { handleSocketConnection };
