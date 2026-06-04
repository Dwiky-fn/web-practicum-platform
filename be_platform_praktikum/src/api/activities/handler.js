const autoBind = require('auto-bind');

class ActivitiesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getRecentActivitiesHandler(req, res) {
    try {
      const { userId } = req.params;

      const activities = await this._service.getRecentActivities(userId);

      return res.status(200).json({
        status: 'success',
        data: { activities },
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

module.exports = ActivitiesHandler;
