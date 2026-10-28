const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const mockPublicPem = publicKey.export({ type: 'spki', format: 'pem' });

jest.mock('jwks-rsa', () => () => ({
  getSigningKey: (kid, cb) => cb(null, { getPublicKey: () => mockPublicPem }),
}));
jest.mock('../../config/env', () => ({
  keycloak: { url: 'http://kc', realm: 'piedraazul', clientId: 'piedraazul-front' },
}));

const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

function sign(payload = {}, opts = {}) {
  return jwt.sign(
    {
      azp: 'piedraazul-front',
      preferred_username: '1061234567',
      given_name: 'Ana',
      family_name: 'Ruiz',
      realm_access: { roles: ['offline_access', 'Patient'] },
      ...payload,
    },
    privateKey,
    { algorithm: 'RS256', issuer: 'http://kc/realms/piedraazul', keyid: 'k1', expiresIn: '5m', ...opts }
  );
}

async function run(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const next = jest.fn();
  await authMiddleware(req, {}, next);
  return { req, err: next.mock.calls[0][0] };
}

describe('authMiddleware (Keycloak)', () => {
  it('sin header → 401', async () => {
    expect((await run()).err.statusCode).toBe(401);
  });

  it('token válido → req.user con cédula y rol', async () => {
    const { req, err } = await run(sign());
    expect(err).toBeUndefined();
    expect(req.user).toEqual(expect.objectContaining({ sub: '1061234567', role: 'Patient' }));
  });

  it('issuer incorrecto → 401', async () => {
    expect((await run(sign({}, { issuer: 'http://otro/realms/x' }))).err.statusCode).toBe(401);
  });

  it('token de otro cliente (azp) → 401', async () => {
    expect((await run(sign({ azp: 'otra-app' }))).err.statusCode).toBe(401);
  });

  it('firmado con otra llave → 401', async () => {
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const bad = jwt.sign({ azp: 'piedraazul-front' }, other, {
      algorithm: 'RS256', issuer: 'http://kc/realms/piedraazul', keyid: 'k1',
    });
    expect((await run(bad)).err.statusCode).toBe(401);
  });

  it('sin rol de la aplicación → 403', async () => {
    const { err } = await run(sign({ realm_access: { roles: ['offline_access'] } }));
    expect(err.statusCode).toBe(403);
  });
});

describe('requireRole', () => {
  it('permite el rol correcto y bloquea los demás con 403', () => {
    const next = jest.fn();
    requireRole('Admin')({ user: { role: 'Admin' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
    requireRole('Admin')({ user: { role: 'Patient' } }, {}, next);
    expect(next.mock.calls[1][0].statusCode).toBe(403);
  });
});