jest.mock('../auth.service', () => ({
  register: jest.fn(),
  createStaffUser: jest.fn(),
  syncFromToken: jest.fn(),
  findByRole: jest.fn(),
  findByCedula: jest.fn(),
  findByCodigoUser: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
}));

const authService = require('../auth.service');
const controller = require('../auth.controller');
const { BadRequestError } = require('../../../shared/errors');
const { mockReq, mockRes } = require('../../../shared/__tests__/helpers');

const validBody = {
  cedUser: 1061234567,
  passUser: 'Password123',
  email: 'ana@correo.com',
  nameUser: 'Ana',
  lastNameUser: 'Ruiz',
};

describe('auth.controller.register', () => {
  it('responde 201 con el codUser de la cuenta creada', async () => {
    authService.register.mockResolvedValue({ codUser: 5 });
    const res = mockRes();

    await controller.register(mockReq({ body: validBody }), res, jest.fn());

    expect(authService.register).toHaveBeenCalledWith(validBody);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ codUser: 5 });
  });

  it('rechaza el registro si faltan campos obligatorios, sin llamar al servicio', async () => {
    const next = jest.fn();

    await controller.register(mockReq({ body: { cedUser: 1061234567 } }), mockRes(), next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toContain("'passUser'");
    expect(error.message).toContain("'email'");
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('entrega al manejador de errores lo que lance el servicio', async () => {
    const failure = new BadRequestError('Ya existe un usuario con esa cédula');
    authService.register.mockRejectedValue(failure);
    const next = jest.fn();

    await controller.register(mockReq({ body: validBody }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});

describe('auth.controller.createScheduler', () => {
  it('crea la cuenta con rol Scheduler y responde 201', async () => {
    authService.createStaffUser.mockResolvedValue({ codUser: 9 });
    const res = mockRes();

    await controller.createScheduler(mockReq({ body: validBody }), res, jest.fn());

    expect(authService.createStaffUser).toHaveBeenCalledWith({ ...validBody, role: 'Scheduler' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ codUser: 9 });
  });

  it('ignora un rol enviado en el cuerpo: nadie puede crearse un Admin por aquí', async () => {
    authService.createStaffUser.mockResolvedValue({ codUser: 9 });

    await controller.createScheduler(
      mockReq({ body: { ...validBody, role: 'Admin' } }),
      mockRes(),
      jest.fn()
    );

    expect(authService.createStaffUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Scheduler' })
    );
  });

  it('rechaza si faltan campos obligatorios', async () => {
    const next = jest.fn();

    await controller.createScheduler(mockReq({ body: { ...validBody, email: '' } }), mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
    expect(authService.createStaffUser).not.toHaveBeenCalled();
  });
});

describe('auth.controller.me', () => {
  it('devuelve el usuario sincronizado a partir de los datos del token', async () => {
    const claims = { sub: '1061234567', role: 'Patient' };
    authService.syncFromToken.mockResolvedValue({ codUser: 1, roleUser: 'Patient' });
    const res = mockRes();

    await controller.me(mockReq({ user: claims }), res, jest.fn());

    expect(authService.syncFromToken).toHaveBeenCalledWith(claims);
    expect(res.json).toHaveBeenCalledWith({ codUser: 1, roleUser: 'Patient' });
  });
});

describe('auth.controller.findByRole', () => {
  it('exige el parámetro role', async () => {
    const next = jest.fn();

    await controller.findByRole(mockReq({ query: {} }), mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });

  it('responde 204 cuando no hay usuarios con ese rol', async () => {
    authService.findByRole.mockResolvedValue([]);
    const res = mockRes();

    await controller.findByRole(mockReq({ query: { role: 'Scheduler' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('devuelve la lista de usuarios del rol', async () => {
    const users = [{ codUser: 1 }, { codUser: 2 }];
    authService.findByRole.mockResolvedValue(users);
    const res = mockRes();

    await controller.findByRole(mockReq({ query: { role: 'Scheduler' } }), res, jest.fn());

    expect(authService.findByRole).toHaveBeenCalledWith('Scheduler');
    expect(res.json).toHaveBeenCalledWith(users);
  });
});

describe('auth.controller.findByCedula / findByCodigo', () => {
  it('findByCedula responde 404 si no existe', async () => {
    authService.findByCedula.mockResolvedValue(null);
    const res = mockRes();

    await controller.findByCedula(mockReq({ params: { cedula: '123456' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('123456') });
  });

  it('findByCedula devuelve el usuario si existe', async () => {
    authService.findByCedula.mockResolvedValue({ codUser: 1 });
    const res = mockRes();

    await controller.findByCedula(mockReq({ params: { cedula: '123456' } }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ codUser: 1 });
  });

  it('findByCodigo responde 404 si no existe', async () => {
    authService.findByCodigoUser.mockResolvedValue(null);
    const res = mockRes();

    await controller.findByCodigo(mockReq({ params: { codigo: '77' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('findByCodigo devuelve el usuario si existe', async () => {
    authService.findByCodigoUser.mockResolvedValue({ codUser: 77 });
    const res = mockRes();

    await controller.findByCodigo(mockReq({ params: { codigo: '77' } }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ codUser: 77 });
  });
});

describe('auth.controller.update / deactivate', () => {
  it('update devuelve el usuario actualizado', async () => {
    authService.update.mockResolvedValue({ codUser: 1, nameUser: 'Nuevo' });
    const res = mockRes();

    await controller.update(mockReq({ params: { id: '1' }, body: { nameUser: 'Nuevo' } }), res, jest.fn());

    expect(authService.update).toHaveBeenCalledWith('1', { nameUser: 'Nuevo' });
    expect(res.json).toHaveBeenCalledWith({ codUser: 1, nameUser: 'Nuevo' });
  });

  it('deactivate responde 204 sin cuerpo', async () => {
    authService.deactivate.mockResolvedValue(undefined);
    const res = mockRes();

    await controller.deactivate(mockReq({ params: { id: '1' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('deactivate entrega el error al manejador si el servicio falla', async () => {
    const failure = new Error('no existe');
    authService.deactivate.mockRejectedValue(failure);
    const next = jest.fn();

    await controller.deactivate(mockReq({ params: { id: '1' } }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});