// src/middleware/requestId.js
function makeRequestId() {
  // Simple and dependency-free
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function requestIdMiddleware(req, res, next) {
  const id = makeRequestId();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestIdMiddleware;
