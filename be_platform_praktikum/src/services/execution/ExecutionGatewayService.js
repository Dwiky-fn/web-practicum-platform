const ExecutionValidator = require('../../validator/execution');

class ExecutionGatewayService {
  constructor(runnerClient, { user = null, activityLogger = null } = {}) {
    this._runnerClient = runnerClient;
    this._user = user;
    this._activityLogger = activityLogger;
    this._activeExecutionId = null;
    this._activeContext = null;
  }

  handleClientMessage(rawMessage, sendToClient) {
    const message = this._parseClientMessage(rawMessage);

    switch (message.type) {
      case 'run':
        this._handleRun(
          ExecutionValidator.validateRunMessage(message),
          sendToClient,
        );
        break;
      case 'input':
      case 'stdin':
        {
          const payload = ExecutionValidator.validateInputMessage(message);
          this._runnerClient.sendInput(payload.data ?? payload.value ?? '');
        }
        break;
      case 'stop':
        ExecutionValidator.validateStopMessage(message);
        this._runnerClient.stop();
        break;
      default:
        throw new Error('Tipe pesan execution tidak dikenali');
    }
  }

  close() {
    if (this._activeExecutionId) {
      const RunningExecutionsTracker = require('./RunningExecutionsTracker');
      RunningExecutionsTracker.remove(this._activeExecutionId);
      this._broadcastExecutionStatus(
        this._activeContext,
        this._user?.id,
        'stopped',
      );
    }
    this._runnerClient.close();
  }

  _handleRun(message, sendToClient) {
    const language = message.language;
    if (!language || (language !== 'java' && language !== 'python')) {
      throw new Error('Bahasa pemrograman tidak didukung');
    }

    const hasFiles = Array.isArray(message.files) && message.files.length > 0;
    if (!hasFiles) {
      throw new Error('Files wajib ada dan tidak boleh kosong');
    }

    if (language === 'java') {
      const invalidFile = message.files.find(
        (file) => !(file.path || file.name || '').endsWith('.java'),
      );
      if (invalidFile) {
        throw new Error(
          'Bahasa Java hanya mendukung file dengan ekstensi .java',
        );
      }
    } else if (language === 'python') {
      const invalidFile = message.files.find(
        (file) => !(file.path || file.name || '').endsWith('.py'),
      );
      if (invalidFile) {
        throw new Error(
          'Bahasa Python hanya mendukung file dengan ekstensi .py',
        );
      }
    }

    if (message.executionId) {
      this._activeExecutionId = message.executionId;
      this._activeContext = message.context;
      const RunningExecutionsTracker = require('./RunningExecutionsTracker');
      RunningExecutionsTracker.add(
        message.executionId,
        this._user?.id,
        message.context || {},
      );
      console.log(
        `[RUN] execution started | executionId: ${message.executionId} | status: RUNNING | studentId: ${this._user?.id}`,
      );
      this._broadcastExecutionStatus(
        message.context,
        this._user?.id,
        'running',
      );
    }

    if (this._activityLogger && this._user?.id && message.executionId) {
      this._activityLogger
        .logRun({
          userId: this._user.id,
          context: message.context,
          executionId: message.executionId,
        })
        .catch((error) => {
          console.error('[execution] gagal mencatat CODE_RUN', error);
        });
    }

    this._runnerClient.run(
      {
        language: message.language,
        code: message.code || '',
        files: message.files,
        mainClass: message.mainClass,
        entryFile: message.entryFile,
      },
      {
        onMessage: (msg) => {
          if (
            msg.type === 'exit' ||
            msg.type === 'error' ||
            msg.type === 'timeout'
          ) {
            const RunningExecutionsTracker = require('./RunningExecutionsTracker');
            RunningExecutionsTracker.remove(message.executionId);
            console.log(
              `[RUN] execution ended | executionId: ${message.executionId} | status: ${msg.type}`,
            );
            this._broadcastExecutionStatus(
              message.context,
              this._user?.id,
              msg.type,
            );
          }
          sendToClient(msg);
        },
        onClose: () => {
          const RunningExecutionsTracker = require('./RunningExecutionsTracker');
          RunningExecutionsTracker.remove(message.executionId);
          console.log(
            `[RUN] execution closed/stopped | executionId: ${message.executionId}`,
          );
          this._broadcastExecutionStatus(
            message.context,
            this._user?.id,
            'stopped',
          );
          sendToClient({ type: 'runner_closed' });
        },
      },
    );
  }

  _broadcastExecutionStatus(context, studentId, status) {
    if (!context || !studentId) return;
    const RunningExecutionsTracker = require('./RunningExecutionsTracker');
    const runningCount = RunningExecutionsTracker.getTotalRunningCount(
      context.kelasPraktikumId,
      context.jobsheetId,
      context.attemptType ?? 'normal',
      context.remedialId ?? null,
    );
    console.log(
      `[WebSocket] Sending monitoring update | status: ${status} | runningCount: ${runningCount}`,
    );
    const MonitoringActivityService = require('../monitoring/MonitoringActivityService');
    MonitoringActivityService.broadcastActivity({
      kelasPraktikumId: context.kelasPraktikumId,
      studentId,
      jobsheetId: context.jobsheetId,
      experimentId: context.experimentId || null,
      exerciseId: context.exerciseId || null,
      instructionId: context.instructionId || null,
      activityType: `code_run_${status}`,
      lastActiveAt: new Date().toISOString(),
    }).catch((error) => {
      console.error('[execution] failed to broadcast status change', error);
    });
  }

  _parseClientMessage(rawMessage) {
    try {
      return JSON.parse(rawMessage.toString());
    } catch (error) {
      throw new Error('Format pesan execution tidak valid');
    }
  }
}

module.exports = ExecutionGatewayService;
