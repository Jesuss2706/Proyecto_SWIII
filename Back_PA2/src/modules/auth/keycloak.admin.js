const env = require('../../config/env');
const { BadRequestError, AppError } = require('../../shared/errors');

const { url, realm, adminClientId, adminClientSecret } = env.keycloak;
const ADMIN_API = `${url}/admin/realms/${realm}`;

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

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Asigna un Realm role (Professional, Scheduler...) al usuario recién creado.
async function assignRealmRole(token, userId, roleName) {
  const roleRes = await fetch(`${ADMIN_API}/roles/${encodeURIComponent(roleName)}`, {
    headers: authHeaders(token),
  });
  if (roleRes.status === 404) {
    throw new AppError(`El rol '${roleName}' no existe en Keycloak (créalo en Realm roles)`, 500);
  }
  if (roleRes.status === 403) {
    throw new AppError(
      "El cliente piedraazul-backend necesita el rol 'view-realm' de realm-management (Service accounts roles)",
      500
    );
  }
  if (!roleRes.ok) {
    throw new AppError('No fue posible consultar el rol en Keycloak', 502);
  }
  const role = await roleRes.json();

  const mapRes = await fetch(`${ADMIN_API}/users/${userId}/role-mappings/realm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify([{ id: role.id, name: role.name }]),
  });
  if (!mapRes.ok) {
    throw new AppError('No fue posible asignar el rol al usuario en Keycloak', 502);
  }
}

async function deleteUser(token, userId) {
  await fetch(`${ADMIN_API}/users/${userId}`, { method: 'DELETE', headers: authHeaders(token) });
}

// Crea el usuario. Si se pasa `role`, además lo asigna; para pacientes no hace falta
// porque Patient es el rol por defecto del realm.
async function createUser({ username, email, firstName, lastName, password, role }) {
  const token = await getAdminToken();

  const res = await fetch(`${ADMIN_API}/users`, {
    method: 'POST',
    headers: authHeaders(token),
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

  if (res.status === 409) {
    throw new BadRequestError('Ya existe una cuenta con esa cédula o ese correo');
  }
  if (res.status !== 201) {
    const detail = await res.text();
    console.error('Keycloak createUser falló:', res.status, detail);
    throw new AppError('No fue posible crear la cuenta en Keycloak', 502);
  }

  if (role) {
    const userId = res.headers.get('location')?.split('/').pop();
    try {
      await assignRealmRole(token, userId, role);
    } catch (err) {
      // No dejar un usuario sin rol en Keycloak: se deshace la creación.
      await deleteUser(token, userId).catch(() => undefined);
      throw err;
    }
  }
}

module.exports = { createUser };