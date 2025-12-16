// src/middleware/auth.js
function unauthorized(res, requestId) {
  return res.status(401).json({
    ok: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header',
      requestId: requestId || null,
    },
  });
}

function authMiddleware(config) {
  if (!config || !config.authToken) {
    throw new Error('authMiddleware: missing config.authToken');
  }

  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return unauthorized(res, req.requestId);
    }

    if (token !== config.authToken) {
      return unauthorized(res, req.requestId);
    }

    next();
  };
}

module.exports = authMiddleware;
