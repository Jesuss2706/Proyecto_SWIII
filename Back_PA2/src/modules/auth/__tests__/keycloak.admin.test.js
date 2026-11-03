// keycloak.admin lee la configuración al cargarse, así que el módulo se carga
// de nuevo en cada prueba con la configuración que necesitemos.
// fetch es global: se reemplaza por un mock (no se toca la red).

const KC = 'http://kc.test';
const ADMIN_API = `${KC}/admin/realms/piedraazul`;

function loadModule(adminClientSecret = 'secreto') {
  let mod;
  jest.isolateModules(() => {
    jest.doMock('../../../config/env', () => ({
      keycloak: {
        url: KC,
        realm: 'piedraazul',
        clientId: 'piedraazul-front',
        adminClientId: 'piedraazul-backend',
        adminClientSecret,
      },
    }));
    mod = require('../keycloak.admin');
  });
  return mod;
}

/** Respuesta mínima de fetch. */
function reply(status, body = {}, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  };
}

const newUser = {
  username: '1061234567',
  email: 'ana@correo.com',
  firstName: 'Ana',
  lastName: 'Ruiz',
  password: 'Password123',
};

describe('keycloak.admin.createUser', () => {
  let consoleSpy;

  beforeEach(() => {
    global.fetch = jest.fn();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete global.fetch;
  });

  it('falla con un error claro si falta el client secret del backend', async () => {
    const { createUser } = loadModule('');

    await expect(createUser(newUser)).rejects.toThrow('KEYCLOAK_ADMIN_CLIENT_SECRET');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('pide el token del service account con client_credentials', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
      .mockResolvedValueOnce(reply(201));
    const { createUser } = loadModule();

    await createUser(newUser);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${KC}/realms/piedraazul/protocol/openid-connect/token`);
    const form = new URLSearchParams(options.body);
    expect(form.get('grant_type')).toBe('client_credentials');
    expect(form.get('client_id')).toBe('piedraazul-backend');
    expect(form.get('client_secret')).toBe('secreto');
  });

  it('responde 502 si Keycloak rechaza las credenciales del backend', async () => {
    fetch.mockResolvedValueOnce(reply(401));
    const { createUser } = loadModule();

    await expect(createUser(newUser)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('crea un paciente sin tocar roles (Patient es el rol por defecto del realm)', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
      .mockResolvedValueOnce(reply(201));
    const { createUser } = loadModule();

    await createUser(newUser);

    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, options] = fetch.mock.calls[1];
    expect(url).toBe(`${ADMIN_API}/users`);
    expect(options.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(options.body)).toMatchObject({
      username: '1061234567',
      email: 'ana@correo.com',
      enabled: true,
      credentials: [{ type: 'password', value: 'Password123', temporary: false }],
    });
  });

  it('traduce el 409 de Keycloak a "ya existe una cuenta" (400)', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
      .mockResolvedValueOnce(reply(409));
    const { createUser } = loadModule();

    await expect(createUser(newUser)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Ya existe una cuenta'),
    });
  });

  it('responde 502 ante cualquier otro fallo al crear el usuario', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
      .mockResolvedValueOnce(reply(500));
    const { createUser } = loadModule();

    await expect(createUser(newUser)).rejects.toMatchObject({ statusCode: 502 });
  });

  describe('cuando se pide un rol (personal de la clínica)', () => {
    const created = reply(201, {}, { location: `${ADMIN_API}/users/abc-123` });

    it('busca el rol y se lo asigna al usuario recién creado', async () => {
      fetch
        .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
        .mockResolvedValueOnce(created)
        .mockResolvedValueOnce(reply(200, { id: 'rol-1', name: 'Scheduler' }))
        .mockResolvedValueOnce(reply(204));
      const { createUser } = loadModule();

      await createUser({ ...newUser, role: 'Scheduler' });

      expect(fetch.mock.calls[2][0]).toBe(`${ADMIN_API}/roles/Scheduler`);
      const [mapUrl, mapOptions] = fetch.mock.calls[3];
      expect(mapUrl).toBe(`${ADMIN_API}/users/abc-123/role-mappings/realm`);
      expect(mapOptions.method).toBe('POST');
      expect(JSON.parse(mapOptions.body)).toEqual([{ id: 'rol-1', name: 'Scheduler' }]);
    });

    it('si el rol no existe en Keycloak, borra el usuario y explica qué falta', async () => {
      fetch
        .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
        .mockResolvedValueOnce(created)
        .mockResolvedValueOnce(reply(404))
        .mockResolvedValueOnce(reply(204));
      const { createUser } = loadModule();

      await expect(createUser({ ...newUser, role: 'Scheduler' })).rejects.toThrow(
        "El rol 'Scheduler' no existe en Keycloak"
      );

      const [deleteUrl, deleteOptions] = fetch.mock.calls[3];
      expect(deleteUrl).toBe(`${ADMIN_API}/users/abc-123`);
      expect(deleteOptions.method).toBe('DELETE');
    });

    it('si el backend no puede leer roles (403), pide dar el permiso view-realm', async () => {
      fetch
        .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
        .mockResolvedValueOnce(created)
        .mockResolvedValueOnce(reply(403))
        .mockResolvedValueOnce(reply(204));
      const { createUser } = loadModule();

      await expect(createUser({ ...newUser, role: 'Professional' })).rejects.toThrow('view-realm');
    });

    it('si falla la asignación del rol, deshace la creación y responde 502', async () => {
      fetch
        .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
        .mockResolvedValueOnce(created)
        .mockResolvedValueOnce(reply(200, { id: 'rol-1', name: 'Scheduler' }))
        .mockResolvedValueOnce(reply(500))
        .mockResolvedValueOnce(reply(204));
      const { createUser } = loadModule();

      await expect(createUser({ ...newUser, role: 'Scheduler' })).rejects.toMatchObject({
        statusCode: 502,
      });
      expect(fetch.mock.calls[4][1].method).toBe('DELETE');
    });

    it('si además falla el borrado de compensación, propaga el error original', async () => {
      fetch
        .mockResolvedValueOnce(reply(200, { access_token: 'tok' }))
        .mockResolvedValueOnce(created)
        .mockResolvedValueOnce(reply(404))
        .mockRejectedValueOnce(new Error('sin red'));
      const { createUser } = loadModule();

      await expect(createUser({ ...newUser, role: 'Scheduler' })).rejects.toThrow(
        "El rol 'Scheduler' no existe"
      );
    });
  });
});