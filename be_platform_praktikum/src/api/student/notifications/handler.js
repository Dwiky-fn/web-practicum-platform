const autoBind = require('auto-bind');

class NotificationsHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getNotificationsHandler(req, res) {
    try {
      const { userId } = req.params;

      const notifications = await this._service.getNotifications(userId);

      return res.status(200).json({
        status: 'success',
        data: { notifications },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
      });
    }
  }
}

module.exports = NotificationsHandler;
