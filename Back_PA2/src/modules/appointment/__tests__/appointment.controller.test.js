jest.mock('../appointment.service', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCodProf: jest.fn(),
  findByCodPatient: jest.fn(),
  findHistoryByPatientCedula: jest.fn(),
  findByStatus: jest.fn(),
  findByCodProfAndDate: jest.fn(),
  findByDateApp: jest.fn(),
  findBySpecialityProf: jest.fn(),
  findFirstAvailableBySpeciality: jest.fn(),
  generateAvailableSlots: jest.fn(),
  generateBySpeciality: jest.fn(),
  exportByIds: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
}));

const appointmentService = require('../appointment.service');
const dateUtils = require('../date-utils');
const controller = require('../appointment.controller');
const { BadRequestError } = require('../../../shared/errors');
const { mockReq, mockRes } = require('../../../shared/__tests__/helpers');

describe('appointment.controller (listados)', () => {
  it('responde 204 cuando la consulta no devuelve citas', async () => {
    appointmentService.findAll.mockResolvedValue([]);
    const res = mockRes();

    await controller.findAll(mockReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('devuelve las citas cuando las hay', async () => {
    appointmentService.findAll.mockResolvedValue([{ codApp: 1 }]);
    const res = mockRes();

    await controller.findAll(mockReq(), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith([{ codApp: 1 }]);
  });

  it('findByCodProf usa el código recibido en la URL', async () => {
    appointmentService.findByCodProf.mockResolvedValue([{ codApp: 1 }]);

    await controller.findByCodProf(mockReq({ params: { codProf: '4' } }), mockRes(), jest.fn());

    expect(appointmentService.findByCodProf).toHaveBeenCalledWith('4');
  });

  it('findByCodProfAndDate usa profesional y fecha de la URL', async () => {
    appointmentService.findByCodProfAndDate.mockResolvedValue([]);

    await controller.findByCodProfAndDate(
      mockReq({ params: { codProf: '4', date: '2026-11-10' } }),
      mockRes(),
      jest.fn()
    );

    expect(appointmentService.findByCodProfAndDate).toHaveBeenCalledWith('4', '2026-11-10');
  });

  it('entrega al manejador de errores lo que lance el servicio', async () => {
    const failure = new Error('BD caída');
    appointmentService.findByStatus.mockRejectedValue(failure);
    const next = jest.fn();

    await controller.findByStatus(mockReq({ params: { status: 'Scheduled' } }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});

describe('appointment.controller.findById', () => {
  it('responde 404 si la cita no existe', async () => {
    appointmentService.findById.mockResolvedValue(null);
    const res = mockRes();

    await controller.findById(mockReq({ params: { id: '99' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('99') });
  });

  it('devuelve la cita si existe', async () => {
    appointmentService.findById.mockResolvedValue({ codApp: 1 });
    const res = mockRes();

    await controller.findById(mockReq({ params: { id: '1' } }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ codApp: 1 });
  });
});

describe('appointment.controller.getGeneratedAppointments', () => {
  it('usa la fecha de hoy si no se envía ninguna', async () => {
    appointmentService.generateAvailableSlots.mockResolvedValue([{ time: '08:00' }]);

    await controller.getGeneratedAppointments(
      mockReq({ query: { codProf: '4' } }),
      mockRes(),
      jest.fn()
    );

    expect(appointmentService.generateAvailableSlots).toHaveBeenCalledWith(
      '4',
      dateUtils.todayStr(),
      undefined
    );
  });

  it('usa la fecha y la especialidad enviadas en la consulta', async () => {
    appointmentService.generateAvailableSlots.mockResolvedValue([]);
    const res = mockRes();

    await controller.getGeneratedAppointments(
      mockReq({ query: { codProf: '4', date: '2026-11-10', speciality: 'General' } }),
      res,
      jest.fn()
    );

    expect(appointmentService.generateAvailableSlots).toHaveBeenCalledWith('4', '2026-11-10', 'General');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('appointment.controller.findHistoryByPatientCedula', () => {
  it.each(['123', '1234567890123', '12.345.678', 'abc12345'])(
    'rechaza la cédula inválida %p',
    async (idPatient) => {
      const next = jest.fn();

      await controller.findHistoryByPatientCedula(mockReq({ params: { idPatient } }), mockRes(), next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
      expect(appointmentService.findHistoryByPatientCedula).not.toHaveBeenCalled();
    }
  );

  it('devuelve el historial de una cédula válida', async () => {
    appointmentService.findHistoryByPatientCedula.mockResolvedValue([{ codApp: 1 }]);
    const res = mockRes();

    await controller.findHistoryByPatientCedula(
      mockReq({ params: { idPatient: '1061234567' } }),
      res,
      jest.fn()
    );

    expect(appointmentService.findHistoryByPatientCedula).toHaveBeenCalledWith('1061234567');
    expect(res.json).toHaveBeenCalledWith([{ codApp: 1 }]);
  });
});

describe('appointment.controller.findFirstAvailable', () => {
  it('responde 204 si no hay horarios disponibles', async () => {
    appointmentService.findFirstAvailableBySpeciality.mockResolvedValue(null);
    const res = mockRes();

    await controller.findFirstAvailable(mockReq({ params: { speciality: 'General' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('devuelve el primer horario disponible', async () => {
    const slot = { codProf: 1, date: '2026-11-10', time: '08:00' };
    appointmentService.findFirstAvailableBySpeciality.mockResolvedValue(slot);
    const res = mockRes();

    await controller.findFirstAvailable(mockReq({ params: { speciality: 'General' } }), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(slot);
  });
});

describe('appointment.controller.create', () => {
  const body = { codProf: 1, codPatient: 2, dateApp: '2026-11-10', timeApp: '09:00:00' };

  it('crea la cita pasando al servicio quién la pide, y responde 201 con Location', async () => {
    const user = { sub: '1061234567', role: 'Patient' };
    appointmentService.create.mockResolvedValue({ codApp: 12, ...body });
    const res = mockRes();

    await controller.create(mockReq({ body, user }), res, jest.fn());

    expect(appointmentService.create).toHaveBeenCalledWith(body, user);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.location).toHaveBeenCalledWith('/api/appointments/12');
  });

  it.each(['codProf', 'codPatient', 'dateApp', 'timeApp'])('rechaza si falta %s', async (field) => {
    const next = jest.fn();

    await controller.create(mockReq({ body: { ...body, [field]: undefined } }), mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
    expect(next.mock.calls[0][0].message).toContain(`'${field}'`);
    expect(appointmentService.create).not.toHaveBeenCalled();
  });
});

describe('appointment.controller.updateStatus', () => {
  it('exige el campo statusApp', async () => {
    const next = jest.fn();

    await controller.updateStatus(mockReq({ params: { id: '1' }, body: {} }), mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });

  it('rechaza un estado que no existe', async () => {
    const next = jest.fn();

    await controller.updateStatus(
      mockReq({ params: { id: '1' }, body: { statusApp: 'VOLANDO' } }),
      mockRes(),
      next
    );

    expect(next.mock.calls[0][0].message).toContain('VOLANDO');
    expect(appointmentService.update).not.toHaveBeenCalled();
  });

  it.each([
    ['ATENDIDA', 'Completed'],
    ['cancelada', 'Cancelled'],
    ['Agendada', 'Scheduled'],
  ])('traduce el estado %s a %s (sin distinguir mayúsculas)', async (alias, status) => {
    appointmentService.update.mockResolvedValue({ codApp: 1, statusApp: status });
    const res = mockRes();

    await controller.updateStatus(mockReq({ params: { id: '1' }, body: { statusApp: alias } }), res, jest.fn());

    expect(appointmentService.update).toHaveBeenCalledWith('1', { statusApp: status });
    expect(res.json).toHaveBeenCalledWith({ codApp: 1, statusApp: status });
  });
});

describe('appointment.controller.cancel', () => {
  it('responde 404 si la cita no existe', async () => {
    appointmentService.cancel.mockResolvedValue(false);
    const res = mockRes();

    await controller.cancel(mockReq({ params: { id: '99' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responde 204 si la cita se canceló', async () => {
    appointmentService.cancel.mockResolvedValue(true);
    const res = mockRes();

    await controller.cancel(mockReq({ params: { id: '1' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('appointment.controller.exportAppointments', () => {
  it("exige el parámetro 'format'", async () => {
    const next = jest.fn();

    await controller.exportAppointments(mockReq({ query: {}, body: [1] }), mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
  });

  it('responde 204 si no se envían ids', async () => {
    const res = mockRes();

    await controller.exportAppointments(mockReq({ query: { format: 'csv' }, body: [] }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(appointmentService.exportByIds).not.toHaveBeenCalled();
  });

  it('responde 204 si el cuerpo no es una lista', async () => {
    const res = mockRes();

    await controller.exportAppointments(
      mockReq({ query: { format: 'csv' }, body: { ids: [1] } }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('envía el archivo con su tipo de contenido y nombre de descarga', async () => {
    const content = Buffer.from('a,b');
    appointmentService.exportByIds.mockResolvedValue({ content, contentType: 'text/csv', extension: '.csv' });
    const res = mockRes();

    await controller.exportAppointments(mockReq({ query: { format: 'csv' }, body: [1, 2] }), res, jest.fn());

    expect(appointmentService.exportByIds).toHaveBeenCalledWith([1, 2], 'csv');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.type).toHaveBeenCalledWith('text/csv');
    expect(res.set).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="citas_export.csv"');
    expect(res.send).toHaveBeenCalledWith(content);
  });
});