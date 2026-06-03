class ExecutionGatewayService {
  constructor(runnerClient) {
    this._runnerClient = runnerClient;
  }

  handleClientMessage(rawMessage, sendToClient) {
    const message = this._parseClientMessage(rawMessage);

    switch (message.type) {
      case 'run':
        this._handleRun(message, sendToClient);
        break;
      case 'input':
        this._runnerClient.sendInput(message.value || '');
        break;
      case 'stop':
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
    if (typeof message.code !== 'string' || message.code.trim() === '') {
      throw new Error('Kode program tidak boleh kosong');
    }

    this._runnerClient.run({
      language: message.language || 'python',
      code: message.code,
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
