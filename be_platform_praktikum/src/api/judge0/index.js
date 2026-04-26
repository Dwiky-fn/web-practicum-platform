const routes = require('./routes');
const Judge0Handler = require('./handler');
const Judge0Service = require('../../services/judge0/judge0Service');
const Judge0RunnerService = require('../../services/postgres/Judge0RunnerService');

module.exports = (app) => {
  const judge0Service = new Judge0Service();
  const runnerService = new Judge0RunnerService(judge0Service);
  const handler = new Judge0Handler(runnerService);

  app.use(routes(handler));
};
