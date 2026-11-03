jest.mock('../professional.service', () => ({
  findAll: jest.fn(),
  findByCodUser: jest.fn(),
  findBySpeciality: jest.fn(),
  findByCodProf: jest.fn(),
  register: jest.fn(),
  registerWithAccount: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
}));

const professionalService = require('../professional.service');
const controller = require('../professional.controller');
const { BadRequestError } = require('../../../shared/errors');
const { mockReq, mockRes } = require('../../../shared/__tests__/helpers');

const profileBody = {
  genProf: 'Femenino',
  typeProf: 'Doctor',
  specialityProf: 'Physiotherapy',
  arrivalTime: '08:00:00',
  departureTime: '16:00:00',
  attentionInterval: 30,
};

const accountBody = {
  ...profileBody,
  cedUser: 1061234567,
  passUser: 'Password123',
  email: 'laura@correo.com',
  nameUser: 'Laura',
  lastNameUser: 'Gómez',
};

describe('professional.controller (consultas)', () => {
  it('findAll responde 204 si no hay profesionales', async () => {
    professionalService.findAll.mockResolvedValue([]);
    const res = mockRes();

    await controller.findAll(mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('findAll devuelve la lista', async () => {
    professionalService.findAll.mockResolvedValue([{ codProf: 1 }]);
    const res = mockRes();

    await controller.findAll(mockReq(), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith([{ codProf: 1 }]);
  });

  it('findByCodUser responde 404 si el usuario no tiene perfil profesional', async () => {
    professionalService.findByCodUser.mockResolvedValue(null);
    const res = mockRes();

    await controller.findByCodUser(mockReq({ params: { codUser: '3' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('findByCodigo responde 404 si no existe y devuelve el profesional si existe', async () => {
    professionalService.findByCodProf.mockResolvedValueOnce(null).mockResolvedValueOnce({ codProf: 2 });
    const notFound = mockRes();
    const found = mockRes();

    await controller.findByCodigo(mockReq({ params: { codigo: '2' } }), notFound, jest.fn());
    await controller.findByCodigo(mockReq({ params: { codigo: '2' } }), found, jest.fn());

    expect(notFound.status).toHaveBeenCalledWith(404);
    expect(found.json).toHaveBeenCalledWith({ codProf: 2 });
  });

  it('findBySpeciality rechaza una especialidad que no existe', async () => {
    const next = jest.fn();

    await controller.findBySpeciality(mockReq({ params: { speciality: 'Dentistry' } }), mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
    expect(professionalService.findBySpeciality).not.toHaveBeenCalled();
  });

  it('findBySpeciality responde 204 si no hay profesionales de esa especialidad', async () => {
    professionalService.findBySpeciality.mockResolvedValue([]);
    const res = mockRes();

    await controller.findBySpeciality(mockReq({ params: { speciality: 'General' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('findBySpeciality devuelve los profesionales de la especialidad', async () => {
    professionalService.findBySpeciality.mockResolvedValue([{ codProf: 1 }]);
    const res = mockRes();

    await controller.findBySpeciality(mockReq({ params: { speciality: 'Chiropractor' } }), res, jest.fn());

    expect(professionalService.findBySpeciality).toHaveBeenCalledWith('Chiropractor');
    expect(res.json).toHaveBeenCalledWith([{ codProf: 1 }]);
  });
});

describe('professional.controller.register', () => {
  it('crea el perfil, responde 201 y la cabecera Location', async () => {
    professionalService.register.mockResolvedValue({ codProf: 6 });
    const res = mockRes();

    await controller.register(mockReq({ body: { codUser: 3, ...profileBody } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.location).toHaveBeenCalledWith('/api/people/professionals/6');
    expect(res.json).toHaveBeenCalledWith({ codProf: 6 });
  });

  it('rechaza si faltan campos obligatorios', async () => {
    const next = jest.fn();

    await controller.register(mockReq({ body: { codUser: 3 } }), mockRes(), next);

    expect(next.mock.calls[0][0].message).toContain("'specialityProf'");
    expect(professionalService.register).not.toHaveBeenCalled();
  });

  it('rechaza un tipo o una especialidad fuera de la lista', async () => {
    const next = jest.fn();

    await controller.register(
      mockReq({ body: { codUser: 3, ...profileBody, typeProf: 'Wizard', specialityProf: 'Magic' } }),
      mockRes(),
      next
    );

    const message = next.mock.calls[0][0].message;
    expect(message).toContain("'typeProf'");
    expect(message).toContain("'specialityProf'");
  });
});

describe('professional.controller.registerWithAccount', () => {
  it('crea cuenta y perfil, responde 201 y la cabecera Location', async () => {
    professionalService.registerWithAccount.mockResolvedValue({ codProf: 8 });
    const res = mockRes();

    await controller.registerWithAccount(mockReq({ body: accountBody }), res, jest.fn());

    expect(professionalService.registerWithAccount).toHaveBeenCalledWith(accountBody);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.location).toHaveBeenCalledWith('/api/people/professionals/8');
  });

  it.each(['cedUser', 'passUser', 'email', 'nameUser', 'lastNameUser', 'specialityProf'])(
    'rechaza si falta %s',
    async (field) => {
      const next = jest.fn();
      const body = { ...accountBody, [field]: undefined };

      await controller.registerWithAccount(mockReq({ body }), mockRes(), next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
      expect(next.mock.calls[0][0].message).toContain(`'${field}'`);
      expect(professionalService.registerWithAccount).not.toHaveBeenCalled();
    }
  );

  it('rechaza un tipo o una especialidad fuera de la lista', async () => {
    const next = jest.fn();

    await controller.registerWithAccount(
      mockReq({ body: { ...accountBody, typeProf: 'Wizard' } }),
      mockRes(),
      next
    );

    expect(next.mock.calls[0][0].message).toContain("'typeProf'");
  });
});

describe('professional.controller.update / deactivate', () => {
  it('update devuelve el profesional actualizado', async () => {
    professionalService.update.mockResolvedValue({ codProf: 1, phoneProf: '300' });
    const res = mockRes();

    await controller.update(mockReq({ params: { id: '1' }, body: { phoneProf: '300' } }), res, jest.fn());

    expect(professionalService.update).toHaveBeenCalledWith('1', { phoneProf: '300' });
    expect(res.json).toHaveBeenCalledWith({ codProf: 1, phoneProf: '300' });
  });

  it('deactivate responde 204', async () => {
    professionalService.deactivate.mockResolvedValue(undefined);
    const res = mockRes();

    await controller.deactivate(mockReq({ params: { id: '1' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });
});