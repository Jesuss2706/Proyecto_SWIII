jest.mock('../auth.model', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  ROLES: ['Professional', 'Admin', 'Patient', 'Scheduler'],
}));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../config/env', () => ({
  jwt: { secret: 'test-secret', expiresIn: '8h' },
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../auth.model');
const authService = require('../auth.service');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../../shared/errors');

describe('auth.service.register', () => {
  it('lanza BadRequestError si ya existe un usuario con esa cédula', async () => {
    User.findOne.mockResolvedValue({ codUser: 1 });

    await expect(
      authService.register({ cedUser: 123, passUser: 'secreto' })
    ).rejects.toThrow(BadRequestError);
  });

  it('crea el usuario encriptando la contraseña con bcrypt', async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hash-simulado');
    User.create.mockResolvedValue({ codUser: 10 });

    const dto = {
      cedUser: 123,
      passUser: 'secreto',
      nameUser: 'Ana',
      lastNameUser: 'Ruiz',
      roleUser: 'Patient',
      securityQuestion: '¿Color favorito?',
      securityAnswer: 'Azul',
    };

    const result = await authService.register(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith('secreto', 10);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ cedUser: 123, passUser: 'hash-simulado', roleUser: 'Patient' })
    );
    expect(result).toEqual({ codUser: 10 });
  });
});

describe('auth.service.login', () => {
  function makeUser(overrides = {}) {
    return {
      cedUser: 123,
      codUser: 1,
      passUser: '$2a$10$hashfalso',
      roleUser: 'Patient',
      statusUser: 'Active',
      nameUser: 'Ana',
      secondNameUser: null,
      lastNameUser: 'Ruiz',
      secondLastNameUser: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('lanza UnauthorizedError si el usuario no existe', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.login({ cedUser: 999, password: 'x' })).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('lanza UnauthorizedError si la contraseña (bcrypt) no coincide', async () => {
    User.findOne.mockResolvedValue(makeUser());
    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.login({ cedUser: 123, password: 'mala' })).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('autentica correctamente con contraseña ya encriptada (bcrypt) y genera token', async () => {
    User.findOne.mockResolvedValue(makeUser());
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('token-firmado');

    const result = await authService.login({ cedUser: 123, password: 'correcta' });

    expect(bcrypt.compare).toHaveBeenCalledWith('correcta', '$2a$10$hashfalso');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: '123', role: 'Patient', codUser: 1 },
      'test-secret',
      { expiresIn: '8h' }
    );
    expect(result.token).toBe('token-firmado');
    expect(result.role).toBe('Patient');
    expect(result.user.codUser).toBe(1);
  });

  it('migra una contraseña en texto plano a bcrypt cuando coincide', async () => {
    const user = makeUser({ passUser: 'plano123' });
    User.findOne.mockResolvedValue(user);
    bcrypt.hash.mockResolvedValue('$2a$10$migrada');
    jwt.sign.mockReturnValue('token');

    await authService.login({ cedUser: 123, password: 'plano123' });

    expect(bcrypt.hash).toHaveBeenCalledWith('plano123', 10);
    expect(user.passUser).toBe('$2a$10$migrada');
    expect(user.save).toHaveBeenCalled();
  });

  it('lanza UnauthorizedError si la contraseña en texto plano no coincide', async () => {
    User.findOne.mockResolvedValue(makeUser({ passUser: 'plano123' }));

    await expect(authService.login({ cedUser: 123, password: 'otra' })).rejects.toThrow(
      UnauthorizedError
    );
  });

  it('lanza UnauthorizedError si el usuario está inactivo', async () => {
    User.findOne.mockResolvedValue(makeUser({ statusUser: 'Inactive' }));
    bcrypt.compare.mockResolvedValue(true);

    await expect(authService.login({ cedUser: 123, password: 'correcta' })).rejects.toThrow(
      UnauthorizedError
    );
  });
});

describe('auth.service.update', () => {
  it('lanza NotFoundError si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(authService.update(99, { nameUser: 'X' })).rejects.toThrow(NotFoundError);
  });

  it('actualiza solo los campos provistos y re-encripta la contraseña si viene', async () => {
    const user = { nameUser: 'Viejo', save: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(user);
    bcrypt.hash.mockResolvedValue('nuevo-hash');

    const result = await authService.update(1, { nameUser: 'Nuevo', passUser: '1234' });

    expect(result.nameUser).toBe('Nuevo');
    expect(result.passUser).toBe('nuevo-hash');
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
