const evaluationController = require('../controllers/evaluationController');
const internalApiKey = require('../middlewares/internalApiKey');

function evaluation(app) {
  app.post('/api/evaluations', internalApiKey, evaluationController);
}

module.exports = evaluation;

