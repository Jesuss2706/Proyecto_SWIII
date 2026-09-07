const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { UnauthorizedError } = require('../errors');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token no proporcionado'));
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
    next();
  } catch (err) {
    next(new UnauthorizedError('Token inválido o expirado'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new UnauthorizedError('No tienes permisos para esta acción'));
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
