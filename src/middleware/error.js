// src/middleware/error.js
function errorMiddleware(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const message =
    status === 500
      ? 'Internal server error'
      : err.message || 'Request failed';

  // Log server-side with requestId for correlation
  console.error('[ocserv-agent] error', {
    requestId: req.requestId,
    code,
    status,
    message: err.message,
  });

  return res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      requestId: req.requestId || null,
    },
  });
}

module.exports = errorMiddleware;
