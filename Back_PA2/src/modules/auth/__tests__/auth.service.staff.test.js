// Cuentas de personal creadas por un administrador (createStaffUser) y su regla
// compartida con el registro público de pacientes.

jest.mock('../auth.model', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  ROLES: ['Professional', 'Admin', 'Patient', 'Scheduler'],
}));
jest.mock('../keycloak.admin', () => ({ createUser: jest.fn() }));

const User = require('../auth.model');
const keycloakAdmin = require('../keycloak.admin');
const authService = require('../auth.service');
const { BadRequestError } = require('../../../shared/errors');

const dto = {
  role: 'Scheduler',
  cedUser: 1061234567,
  passUser: 'Password123',
  email: 'ana@correo.com',
  nameUser: 'Ana',
  secondNameUser: 'María',
  lastNameUser: 'Ruiz',
  secondLastNameUser: 'Soto',
};

describe('auth.service.createStaffUser', () => {
  beforeEach(() => {
    User.findOne.mockResolvedValue(null);
    keycloakAdmin.createUser.mockResolvedValue(undefined);
    User.create.mockResolvedValue({ codUser: 21 });
  });

  it.each(['Admin', 'Patient', 'Hacker', undefined])(
    'solo acepta Professional o Scheduler: rechaza el rol %p',
    async (role) => {
      await expect(authService.createStaffUser({ ...dto, role })).rejects.toThrow(BadRequestError);

      expect(keycloakAdmin.createUser).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    }
  );

  it.each(['123', '1234567890123', 'abc12345', '12 345 678'])(
    'rechaza la cédula inválida %p antes de llamar a Keycloak',
    async (cedUser) => {
      await expect(authService.createStaffUser({ ...dto, cedUser })).rejects.toThrow('cédula');

      expect(keycloakAdmin.createUser).not.toHaveBeenCalled();
    }
  );

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    await expect(authService.createStaffUser({ ...dto, passUser: '1234567' })).rejects.toThrow(
      'mínimo 8 caracteres'
    );

    expect(keycloakAdmin.createUser).not.toHaveBeenCalled();
  });

  it('rechaza una cédula que ya existe en la base local', async () => {
    User.findOne.mockResolvedValue({ codUser: 3 });

    await expect(authService.createStaffUser(dto)).rejects.toThrow('Ya existe un usuario con esa cédula');

    expect(keycloakAdmin.createUser).not.toHaveBeenCalled();
  });

  it('crea la cuenta en Keycloak con el rol pedido y la copia local en auth.users', async () => {
    const result = await authService.createStaffUser(dto);

    expect(keycloakAdmin.createUser).toHaveBeenCalledWith({
      username: '1061234567',
      email: 'ana@correo.com',
      firstName: 'Ana',
      lastName: 'Ruiz',
      password: 'Password123',
      role: 'Scheduler',
    });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ cedUser: 1061234567, nameUser: 'Ana', roleUser: 'Scheduler' })
    );
    expect(result).toEqual({ codUser: 21 });
  });

  it('no guarda la contraseña en la base local (vive solo en Keycloak)', async () => {
    await authService.createStaffUser(dto);

    expect(User.create.mock.calls[0][0]).not.toHaveProperty('passUser');
  });

  it('si Keycloak falla, no crea la copia local', async () => {
    keycloakAdmin.createUser.mockRejectedValue(new BadRequestError('Ya existe una cuenta con esa cédula o ese correo'));

    await expect(authService.createStaffUser(dto)).rejects.toThrow('Ya existe una cuenta');

    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('auth.service.register (paciente)', () => {
  it('no envía rol a Keycloak: Patient es el rol por defecto del realm', async () => {
    User.findOne.mockResolvedValue(null);
    keycloakAdmin.createUser.mockResolvedValue(undefined);
    User.create.mockResolvedValue({ codUser: 22 });

    await authService.register({ ...dto, role: undefined });

    expect(keycloakAdmin.createUser).toHaveBeenCalledWith(
      expect.not.objectContaining({ role: expect.anything() })
    );
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ roleUser: 'Patient' }));
  });
});