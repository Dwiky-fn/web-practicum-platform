const pool = require('../services/postgres');
const TokenService = require('../services/auth/TokenService');
const {
  AuthenticationError,
  AuthorizationError,
} = require('../exceptions');

const tokenService = new TokenService();

function sendUnauthorized(
  next,
  message = 'Sesi tidak valid, silakan login ulang',
) {
  return next(new AuthenticationError(message));
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || '';
  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return sendUnauthorized(next);
    }

    const user = await authenticateToken(token);

    if (!user) {
      return sendUnauthorized(next);
    }

    req.user = user;

    return next();
  } catch (error) {
    if (
      error.message === 'AUTH_TOKEN_INVALID' ||
      error.message === 'AUTH_TOKEN_EXPIRED'
    ) {
      return sendUnauthorized(next);
    }

    return next(error);
  }
}

async function authenticateToken(token) {
  const payload = tokenService.verify(token);
  const result = await pool.query(
    'SELECT id, role, is_active FROM users WHERE id = $1 LIMIT 1',
    [payload.sub],
  );

  if (!result.rows.length || !result.rows[0].is_active) {
    return null;
  }

  return {
    id: result.rows[0].id,
    role: result.rows[0].role,
  };
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(next);
    }

    if (!roles.includes(req.user.role)) {
      console.warn('[auth] forbidden role access', {
        method: req.method,
        path: req.originalUrl,
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles: roles,
      });

      return next(new AuthorizationError('Anda tidak memiliki akses ke fitur ini'));
    }

    return next();
  };
}

function requireSelfOrRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(next);
    }

    if (req.params.id === req.user.id || req.params.userId === req.user.id) {
      return next();
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return next(new AuthorizationError('Anda hanya dapat mengakses data akun sendiri'));
  };
}

function requireTargetUserOrRoles(targetKeys, ...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(next);
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    const keys = Array.isArray(targetKeys) ? targetKeys : [targetKeys];
    const targetUserId = keys
      .map((key) => req.params[key] || req.query[key] || req.body?.[key])
      .find(Boolean);

    if (targetUserId && targetUserId === req.user.id) {
      return next();
    }

    return next(new AuthorizationError('Anda hanya dapat mengakses data sendiri'));
  };
}

module.exports = {
  requireAuth,
  authenticateToken,
  requireRoles,
  requireSelfOrRoles,
  requireTargetUserOrRoles,
};
