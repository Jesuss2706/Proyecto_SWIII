jest.mock('../auth.model', () => ({
  findOne: jest.fn(),
  findOrCreate: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  ROLES: ['Professional', 'Admin', 'Patient', 'Scheduler'],
}));

const User = require('../auth.model');
const authService = require('../auth.service');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../../shared/errors');

describe('auth.service.syncFromToken', () => {
  const claims = { sub: '1061234567', role: 'Patient', firstName: 'Ana', lastName: 'Ruiz' };

  function makeUser(overrides = {}) {
    return {
      codUser: 1,
      cedUser: '1061234567',
      nameUser: 'Ana',
      lastNameUser: 'Ruiz',
      statusUser: 'Active',
      roleUser: 'Patient',
      changed: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('rechaza un username que no sea una cédula numérica', async () => {
    await expect(authService.syncFromToken({ ...claims, sub: 'admin' })).rejects.toThrow(BadRequestError);
  });

  it('crea el usuario local la primera vez', async () => {
    User.findOrCreate.mockResolvedValue([makeUser(), true]);

    const result = await authService.syncFromToken(claims);

    expect(User.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cedUser: '1061234567' } })
    );
    expect(result).toEqual(expect.objectContaining({ codUser: 1, cedUser: 1061234567, roleUser: 'Patient' }));
  });

  it('actualiza el rol local si cambió en Keycloak', async () => {
    const user = makeUser({ changed: jest.fn().mockReturnValue(true) });
    User.findOrCreate.mockResolvedValue([user, false]);

    const result = await authService.syncFromToken({ ...claims, role: 'Admin' });

    expect(user.roleUser).toBe('Admin');
    expect(user.save).toHaveBeenCalled();
    expect(result.roleUser).toBe('Admin');
  });

  it('lanza UnauthorizedError si el usuario local está inactivo', async () => {
    User.findOrCreate.mockResolvedValue([makeUser({ statusUser: 'Inactive' }), false]);
    await expect(authService.syncFromToken(claims)).rejects.toThrow(UnauthorizedError);
  });
});

describe('auth.service.update', () => {
  it('lanza NotFoundError si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(authService.update(99, { nameUser: 'X' })).rejects.toThrow(NotFoundError);
  });

  it('actualiza solo los campos provistos', async () => {
    const user = { nameUser: 'Viejo', save: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(user);

    const result = await authService.update(1, { nameUser: 'Nuevo' });

    expect(result.nameUser).toBe('Nuevo');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('auth.service.deactivate', () => {
  it('lanza NotFoundError si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(authService.deactivate(1)).rejects.toThrow(NotFoundError);
  });

  it('marca al usuario como Inactive y lo guarda', async () => {
    const user = { statusUser: 'Active', save: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(user);

    await authService.deactivate(1);

    expect(user.statusUser).toBe('Inactive');
    expect(user.save).toHaveBeenCalled();
  });
});