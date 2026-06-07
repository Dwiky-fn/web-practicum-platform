const {
  sendStart,
  sendStdout,
  sendStderr,
  sendExit,
  sendError,
} = require('../utils/send');
const {
  createWorkspace,
  writeWorkspaceFiles,
  cleanupWorkspace,
} = require('../services/workspaceService');
const { runProgram } = require('../runners');
const { sanitizeRelativePath } = require('../utils/pathSecurity');

const DEFAULT_TIMEOUT_MS = 10_000;

function validateRunPayload(payload) {
  if (!payload || payload.type !== 'run') {
    throw new Error('Payload run tidak valid');
  }

  if (!['java', 'python'].includes(payload.language)) {
    throw new Error('language harus java atau python');
  }

  if (!payload.entryFile) {
    throw new Error('entryFile wajib diisi');
  }

  sanitizeRelativePath(payload.entryFile);

  if (!Array.isArray(payload.files) || payload.files.length === 0) {
    throw new Error('files wajib berupa array dan tidak boleh kosong');
  }

  payload.files.forEach((file) => {
    if (!file || typeof file !== 'object') {
      throw new Error('Format file tidak valid');
    }

    sanitizeRelativePath(file.path);
  });
}

function handleSocketConnection(ws) {
  let currentProcess = null;
  let workspaceDir = null;
  let timeoutHandle = null;
  let stoppedByUser = false;
  let timedOut = false;

  function clearTimer() {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  }

  function resetState() {
    currentProcess = null;
    clearTimer();
    cleanupWorkspace(workspaceDir);
    workspaceDir = null;
    stoppedByUser = false;
    timedOut = false;
  }

  function stopCurrentProcess() {
    if (currentProcess && !currentProcess.killed) {
      currentProcess.kill();
    }
  }

  function attachProcess(process) {
    currentProcess = process;

    process.stdout.on('data', (data) => {
      sendStdout(ws, data.toString());
    });

    process.stderr.on('data', (data) => {
      sendStderr(ws, data.toString());
    });

    process.on('error', (error) => {
      sendError(ws, error.message);
      resetState();
    });

    process.on('close', (code) => {
      clearTimer();

      if (stoppedByUser) {
        sendExit(ws, null, 'Program stopped');
        resetState();
        return;
      }

      if (timedOut) {
        resetState();
        return;
      }

      sendExit(ws, code, 'Program finished');
      resetState();
    });

    timeoutHandle = setTimeout(() => {
      timedOut = true;
      sendError(ws, 'Execution timeout');
      stopCurrentProcess();
    }, DEFAULT_TIMEOUT_MS);
  }

  async function handleRun(payload) {
    if (currentProcess) {
      sendError(ws, 'Program is already running');
      return;
    }

    try {
      validateRunPayload(payload);

      workspaceDir = createWorkspace();
      writeWorkspaceFiles(workspaceDir, payload.files);

      const process = await runProgram({
        language: payload.language,
        workspaceDir,
        entryFile: payload.entryFile,
        onStdout: (data) => sendStdout(ws, data),
        onStderr: (data) => sendStderr(ws, data),
      });

      sendStart(ws, 'Program started');
      attachProcess(process);
    } catch (error) {
      sendError(ws, error.message);
      resetState();
    }
  }

  ws.on('message', (message) => {
    let payload;

    try {
      payload = JSON.parse(message.toString());
    } catch {
      sendError(ws, 'Format JSON tidak valid');
      return;
    }

    if (payload.type === 'run') {
      handleRun(payload);
      return;
    }

    if (payload.type === 'stdin' || payload.type === 'input') {
      if (!currentProcess) {
        sendError(ws, 'Tidak ada program yang sedang berjalan');
        return;
      }

      currentProcess.stdin.write(String(payload.data ?? payload.value ?? ''));
      return;
    }

    if (payload.type === 'stop') {
      if (!currentProcess) {
        sendExit(ws, null, 'Program stopped');
        return;
      }

      stoppedByUser = true;
      stopCurrentProcess();
      return;
    }

    sendError(ws, 'Tipe message tidak dikenali');
  });

  ws.on('close', () => {
    stopCurrentProcess();
    resetState();
  });
}

module.exports = { handleSocketConnection };

