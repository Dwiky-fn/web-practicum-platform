const { randomUUID } = require('crypto');

function requestId(req, res, next) {
  const incomingRequestId = req.headers['x-request-id'];

  const isValidIncomingId =
    typeof incomingRequestId === 'string'
    && incomingRequestId.trim().length > 0
    && incomingRequestId.length <= 100;

  req.requestId = isValidIncomingId
    ? incomingRequestId.trim()
    : randomUUID();

  res.setHeader('X-Request-ID', req.requestId);

  next();
}

module.exports = requestId;