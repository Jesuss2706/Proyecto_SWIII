const env = require('../../config/env');
const { BadRequestError, AppError } = require('../../shared/errors');

const { url, realm, adminClientId, adminClientSecret } = env.keycloak;

// Token del "service account" del backend (client_credentials).
async function getAdminToken() {
  if (!adminClientSecret) {
    throw new AppError('Falta KEYCLOAK_ADMIN_CLIENT_SECRET en el .env del backend', 500);
  }
  const res = await fetch(`${url}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: adminClientId,
      client_secret: adminClientSecret,
    }),
  });
  if (!res.ok) {
    throw new AppError('El backend no pudo autenticarse en Keycloak (revisa el client secret)', 502);
  }
  return (await res.json()).access_token;
}

async function createUser({ username, email, firstName, lastName, password }) {
  const token = await getAdminToken();

  const res = await fetch(`${url}/admin/realms/${realm}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      emailVerified: true,
      credentials: [{ type: 'password', value: password, temporary: false }],
    }),
  });

  if (res.status === 201) return;
  if (res.status === 409) {
    throw new BadRequestError('Ya existe una cuenta con esa cédula o ese correo');
  }
  const detail = await res.text();
  console.error('Keycloak createUser falló:', res.status, detail);
  throw new AppError('No fue posible crear la cuenta en Keycloak', 502);
}

module.exports = { createUser };