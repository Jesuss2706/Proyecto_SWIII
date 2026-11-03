jest.mock('../patient.service', () => ({
  findAll: jest.fn(),
  findByIdPatient: jest.fn(),
  findByCodPatient: jest.fn(),
  register: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

const patientService = require('../patient.service');
const controller = require('../patient.controller');
const { BadRequestError } = require('../../../shared/errors');
const { mockReq, mockRes } = require('../../../shared/__tests__/helpers');

describe('patient.controller.findAll', () => {
  it('responde 204 si no hay pacientes', async () => {
    patientService.findAll.mockResolvedValue([]);
    const res = mockRes();

    await controller.findAll(mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('devuelve la lista de pacientes', async () => {
    const patients = [{ codPatient: 1 }];
    patientService.findAll.mockResolvedValue(patients);
    const res = mockRes();

    await controller.findAll(mockReq(), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(patients);
  });
});

describe('patient.controller.findById / findByCod', () => {
  it('findById responde 404 si no existe', async () => {
    patientService.findByIdPatient.mockResolvedValue(null);
    const res = mockRes();

    await controller.findById(mockReq({ params: { idPatient: '123456' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('findById devuelve el paciente', async () => {
    patientService.findByIdPatient.mockResolvedValue({ codPatient: 1 });
    const res = mockRes();

    await controller.findById(mockReq({ params: { idPatient: '123456' } }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ codPatient: 1 });
  });

  it('findByCod responde 404 si no existe', async () => {
    patientService.findByCodPatient.mockResolvedValue(null);
    const res = mockRes();

    await controller.findByCod(mockReq({ params: { codPatient: '9' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('findByCod devuelve el paciente', async () => {
    patientService.findByCodPatient.mockResolvedValue({ codPatient: 9 });
    const res = mockRes();

    await controller.findByCod(mockReq({ params: { codPatient: '9' } }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ codPatient: 9 });
  });
});

describe('patient.controller.register', () => {
  const body = { idPatient: 1061234567, namePatient: 'Ana', lastNamePatient: 'Ruiz', genderPatient: 'Femenino' };

  it('crea el paciente, responde 201 y la cabecera Location', async () => {
    patientService.register.mockResolvedValue({ codPatient: 4, ...body });
    const res = mockRes();

    await controller.register(mockReq({ body }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.location).toHaveBeenCalledWith('/api/people/patients/4');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ codPatient: 4 }));
  });

  it('rechaza si faltan campos obligatorios', async () => {
    const next = jest.fn();

    await controller.register(mockReq({ body: { idPatient: 1 } }), mockRes(), next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toContain("'namePatient'");
    expect(patientService.register).not.toHaveBeenCalled();
  });
});

describe('patient.controller.update / remove', () => {
  it('update devuelve el paciente actualizado', async () => {
    patientService.update.mockResolvedValue({ codPatient: 1, namePatient: 'Nuevo' });
    const res = mockRes();

    await controller.update(mockReq({ params: { id: '1' }, body: { namePatient: 'Nuevo' } }), res, jest.fn());

    expect(patientService.update).toHaveBeenCalledWith('1', { namePatient: 'Nuevo' });
    expect(res.json).toHaveBeenCalledWith({ codPatient: 1, namePatient: 'Nuevo' });
  });

  it('remove responde 204', async () => {
    patientService.remove.mockResolvedValue(undefined);
    const res = mockRes();

    await controller.remove(mockReq({ params: { id: '1' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('remove entrega el error al manejador si el servicio falla', async () => {
    const failure = new Error('no existe');
    patientService.remove.mockRejectedValue(failure);
    const next = jest.fn();

    await controller.remove(mockReq({ params: { id: '1' } }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});