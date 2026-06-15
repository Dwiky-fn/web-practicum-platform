const autoBind = require('auto-bind');

class ActivitiesHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getRecentActivitiesHandler(req, res, next) {
    try {
      const { userId } = req.params;

      const activities = await this._service.getRecentActivities(userId);

      return res.status(200).json({
        status: 'success',
        data: { activities },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = ActivitiesHandler;
