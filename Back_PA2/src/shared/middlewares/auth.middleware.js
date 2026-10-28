const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const env = require('../../config/env');
const { UnauthorizedError, ForbiddenError } = require('../errors');

const ISSUER = `${env.keycloak.url}/realms/${env.keycloak.realm}`;

// Descarga (y cachea) las llaves públicas de Keycloak para validar la firma del token.
const client = jwksClient({
  jwksUri: `${ISSUER}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: ISSUER }, (err, payload) =>
      err ? reject(err) : resolve(payload)
    );
  });
}

// Roles de la aplicación (deben existir como Realm roles en Keycloak con este nombre exacto).
const APP_ROLES = ['Admin', 'Professional', 'Scheduler', 'Patient'];

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token no proporcionado'));
  }

  let payload;
  try {
    payload = await verifyToken(header.split(' ')[1]);
  } catch (err) {
    return next(new UnauthorizedError('Token inválido o expirado'));
  }

  // El token debe haber sido emitido para el cliente de ESTA aplicación.
  if (payload.azp !== env.keycloak.clientId) {
    return next(new UnauthorizedError('Token emitido para otra aplicación'));
  }

  const realmRoles = payload.realm_access?.roles ?? [];
  const role = APP_ROLES.find((r) => realmRoles.includes(r));
  if (!role) {
    return next(new ForbiddenError('Tu usuario no tiene un rol asignado en el sistema'));
  }

  // Mismo contrato que antes: req.user.sub = cédula, req.user.role = rol.
  // Así appointment.service y requireRole siguen funcionando sin cambios.
  req.user = {
    sub: payload.preferred_username, // la cédula es el username en Keycloak
    role,
    keycloakId: payload.sub,
    firstName: payload.given_name,
    lastName: payload.family_name,
    email: payload.email,
  };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('No tienes permisos para esta acción'));
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };