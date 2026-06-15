const ExecutionValidator = require('../../validator/execution');

class ExecutionGatewayService {
  constructor(runnerClient) {
    this._runnerClient = runnerClient;
  }

  handleClientMessage(rawMessage, sendToClient) {
    const message = this._parseClientMessage(rawMessage);

    switch (message.type) {
      case 'run':
        this._handleRun(ExecutionValidator.validateRunMessage(message), sendToClient);
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
      const invalidFile = message.files.find(file => !(file.path || file.name || '').endsWith('.java'));
      if (invalidFile) {
        throw new Error('Bahasa Java hanya mendukung file dengan ekstensi .java');
      }
    } else if (language === 'python') {
      const invalidFile = message.files.find(file => !(file.path || file.name || '').endsWith('.py'));
      if (invalidFile) {
        throw new Error('Bahasa Python hanya mendukung file dengan ekstensi .py');
      }
    }

    const hasCode = typeof message.code === 'string' && message.code.trim() !== '';

    this._runnerClient.run({
      language: message.language,
      code: message.code || '',
      files: message.files,
      mainClass: message.mainClass,
      entryFile: message.entryFile,
    }, {
      onMessage: sendToClient,
      onClose: () => {
        sendToClient({ type: 'runner_closed' });
      },
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
