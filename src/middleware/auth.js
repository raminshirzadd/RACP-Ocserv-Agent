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

/**
 * Bearer authentication middleware with token rotation support.
 *
 * Accepted tokens:
 *   - config.authTokenCurrent   (required)
 *   - config.authTokenPrevious  (optional, for rotation)
 */
function authMiddleware(config) {
  if (!config || !config.authTokenCurrent) {
    throw new Error(
      'authMiddleware: missing config.authTokenCurrent'
    );
  }

  const currentToken = String(config.authTokenCurrent);
  const previousToken = config.authTokenPrevious
    ? String(config.authTokenPrevious)
    : null;

  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return unauthorized(res, req.requestId);
    }

    // Accept CURRENT token
    if (token === currentToken) {
      return next();
    }

    // Accept PREVIOUS token (if defined)
    if (previousToken && token === previousToken) {
      return next();
    }

    return unauthorized(res, req.requestId);
  };
}

module.exports = authMiddleware;
