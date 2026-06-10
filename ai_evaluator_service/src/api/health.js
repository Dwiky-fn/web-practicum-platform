const healthController = require('../controllers/healthController');

function health(app) {
  app.get('/health', healthController);
}

module.exports = health;
