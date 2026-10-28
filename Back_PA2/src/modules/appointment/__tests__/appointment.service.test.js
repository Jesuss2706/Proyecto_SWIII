jest.mock('../appointment.model', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../people', () => ({
  getPatientByCod: jest.fn(),
  getActiveProfessionalByCod: jest.fn(),
  getActiveProfessionalsBySpeciality: jest.fn(),
  getAllActiveProfessionals: jest.fn(),
}));
jest.mock('../slot-generator', () => ({
  generateSlotsForProfessional: jest.fn(),
  buildBusyKeys: jest.fn(),
}));
jest.mock('../date-utils', () => ({
  todayStr: jest.fn(),
  addDays: jest.fn(),
  isBeforeDate: jest.fn(),
  isWeekend: jest.fn(),
}));
jest.mock('../festivos', () => ({ esFestivo: jest.fn() }));
jest.mock('../export/export.service', () => ({
  exportAppointments: jest.fn(),
  getContentType: jest.fn(),
  getFileExtension: jest.fn(),
}));

const Appointment = require('../appointment.model');
const people = require('../../people');
const { generateSlotsForProfessional, buildBusyKeys } = require('../slot-generator');
const dateUtils = require('../date-utils');
const festivos = require('../festivos');
const exportService = require('../export/export.service');
const appointmentService = require('../appointment.service');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../../shared/errors');

describe('appointment.service.create', () => {
  const dto = { codPatient: 1, codProf: 2, dateApp: '2026-03-16', timeApp: '09:00' };

  it('lanza NotFoundError si el paciente no existe', async () => {
    people.getPatientByCod.mockResolvedValue(null);

    await expect(appointmentService.create(dto)).rejects.toThrow(NotFoundError);
  });

  it('lanza ForbiddenError si un paciente intenta agendar para otra cédula', async () => {
    people.getPatientByCod.mockResolvedValue({ idPatient: 555 });
    const requester = { role: 'Patient', sub: '111' };

    await expect(appointmentService.create(dto, requester)).rejects.toThrow(ForbiddenError);
  });

  it('permite a un paciente agendar para su propia cédula', async () => {
    people.getPatientByCod.mockResolvedValue({ idPatient: 111 });
    people.getActiveProfessionalByCod.mockResolvedValue({ codProf: 2 });
    Appointment.findOne.mockResolvedValue(null);
    Appointment.create.mockResolvedValue({ codApp: 1, ...dto, statusApp: 'Scheduled' });

    const requester = { role: 'Patient', sub: '111' };
    const result = await appointmentService.create(dto, requester);

    expect(result.statusApp).toBe('Scheduled');
  });

  it('lanza NotFoundError si el profesional no existe o no está activo', async () => {
    people.getPatientByCod.mockResolvedValue({ idPatient: 1 });
    people.getActiveProfessionalByCod.mockResolvedValue(null);

    await expect(appointmentService.create(dto)).rejects.toThrow(NotFoundError);
  });

  it('lanza BadRequestError si el paciente ya tiene una cita agendada', async () => {
    people.getPatientByCod.mockResolvedValue({ idPatient: 1 });
    people.getActiveProfessionalByCod.mockResolvedValue({ codProf: 2 });
    Appointment.findOne.mockResolvedValue({ codApp: 99, statusApp: 'Scheduled' });

    await expect(appointmentService.create(dto)).rejects.toThrow(BadRequestError);
  });

  it('crea la cita con estado Scheduled cuando todo es válido', async () => {
    people.getPatientByCod.mockResolvedValue({ idPatient: 1 });
    people.getActiveProfessionalByCod.mockResolvedValue({ codProf: 2 });
    Appointment.findOne.mockResolvedValue(null);
    Appointment.create.mockResolvedValue({ codApp: 5, ...dto, statusApp: 'Scheduled' });

    const result = await appointmentService.create(dto);

    expect(Appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({ codProf: 2, codPatient: 1, statusApp: 'Scheduled' })
    );
    expect(result.codApp).toBe(5);
  });
});

describe('appointment.service.update', () => {
  function makeAppointment(overrides = {}) {
    return {
      codApp: 1,
      statusApp: 'Scheduled',
      dateApp: '2026-03-16',
      timeApp: '09:00',
      descApp: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('lanza NotFoundError si la cita no existe', async () => {
    Appointment.findByPk.mockResolvedValue(null);
    await expect(appointmentService.update(1, {})).rejects.toThrow(NotFoundError);
  });

  it('permite reagendar fecha y hora si la cita se puede reagendar', async () => {
    const appointment = makeAppointment();
    Appointment.findByPk.mockResolvedValue(appointment);

    const result = await appointmentService.update(1, { dateApp: '2026-03-20', timeApp: '10:00' });

    expect(result.dateApp).toBe('2026-03-20');
    expect(result.timeApp).toBe('10:00');
    expect(appointment.save).toHaveBeenCalled();
  });

  it('lanza BadRequestError al reagendar una cita cancelada', async () => {
    Appointment.findByPk.mockResolvedValue(makeAppointment({ statusApp: 'Cancelled' }));

    await expect(
      appointmentService.update(1, { dateApp: '2026-03-20' })
    ).rejects.toThrow(BadRequestError);
  });

  it('lanza BadRequestError al reagendar una cita completada', async () => {
    Appointment.findByPk.mockResolvedValue(makeAppointment({ statusApp: 'Completed' }));

    await expect(
      appointmentService.update(1, { timeApp: '10:00' })
    ).rejects.toThrow(BadRequestError);
  });

  it('permite cancelar una cita agendada', async () => {
    const appointment = makeAppointment();
    Appointment.findByPk.mockResolvedValue(appointment);

    const result = await appointmentService.update(1, { statusApp: 'Cancelled' });

    expect(result.statusApp).toBe('Cancelled');
  });

  it('lanza BadRequestError al intentar cancelar una cita ya completada', async () => {
    Appointment.findByPk.mockResolvedValue(makeAppointment({ statusApp: 'Completed' }));

    await expect(
      appointmentService.update(1, { statusApp: 'Cancelled' })
    ).rejects.toThrow(BadRequestError);
  });

  it('permite completar una cita agendada', async () => {
    const appointment = makeAppointment();
    Appointment.findByPk.mockResolvedValue(appointment);

    const result = await appointmentService.update(1, { statusApp: 'Completed' });

    expect(result.statusApp).toBe('Completed');
  });

  it('lanza BadRequestError al intentar completar una cita cancelada', async () => {
    Appointment.findByPk.mockResolvedValue(makeAppointment({ statusApp: 'Cancelled' }));

    await expect(
      appointmentService.update(1, { statusApp: 'Completed' })
    ).rejects.toThrow(BadRequestError);
  });

  it('actualiza la descripción sin afectar el estado', async () => {
    const appointment = makeAppointment();
    Appointment.findByPk.mockResolvedValue(appointment);

    const result = await appointmentService.update(1, { descApp: 'Control de rutina' });

    expect(result.descApp).toBe('Control de rutina');
    expect(result.statusApp).toBe('Scheduled');
  });
});

describe('appointment.service.cancel', () => {
  it('retorna false si la cita no existe', async () => {
    Appointment.findByPk.mockResolvedValue(null);
    expect(await appointmentService.cancel(1)).toBe(false);
  });

  it('cancela y retorna true si la cita se puede cancelar', async () => {
    const appointment = { statusApp: 'Scheduled', save: jest.fn().mockResolvedValue(undefined) };
    Appointment.findByPk.mockResolvedValue(appointment);

    const result = await appointmentService.cancel(1);

    expect(result).toBe(true);
    expect(appointment.statusApp).toBe('Cancelled');
  });

  it('lanza BadRequestError si la cita ya está completada', async () => {
    Appointment.findByPk.mockResolvedValue({ statusApp: 'Completed' });
    await expect(appointmentService.cancel(1)).rejects.toThrow(BadRequestError);
  });
});

describe('appointment.service.findBySpecialityProf', () => {
  it('retorna un arreglo vacío si no hay profesionales con esa especialidad', async () => {
    people.getActiveProfessionalsBySpeciality.mockResolvedValue([]);
    const result = await appointmentService.findBySpecialityProf('General');
    expect(result).toEqual([]);
    expect(Appointment.findAll).not.toHaveBeenCalled();
  });

  it('busca citas de los profesionales encontrados', async () => {
    people.getActiveProfessionalsBySpeciality.mockResolvedValue([{ codProf: 1 }, { codProf: 2 }]);
    Appointment.findAll.mockResolvedValue([{ codApp: 1 }]);

    const result = await appointmentService.findBySpecialityProf('General');

    expect(Appointment.findAll).toHaveBeenCalled();
    expect(result).toEqual([{ codApp: 1 }]);
  });
});

describe('appointment.service.generateAvailableSlots', () => {
  it('usa la fecha de hoy si no se provee una fecha', async () => {
    dateUtils.todayStr.mockReturnValue('2026-03-16');
    people.getAllActiveProfessionals.mockResolvedValue([{ codProf: 1 }]);
    Appointment.findAll.mockResolvedValue([]);
    buildBusyKeys.mockReturnValue(new Set());
    generateSlotsForProfessional.mockReturnValue([{ timeApp: '09:00' }]);

    const slots = await appointmentService.generateAvailableSlots(null, undefined, null);

    expect(slots).toEqual([{ timeApp: '09:00' }]);
  });

  it('filtra por profesional específico cuando se provee codProf', async () => {
    people.getActiveProfessionalByCod.mockResolvedValue({ codProf: 7 });
    Appointment.findAll.mockResolvedValue([]);
    buildBusyKeys.mockReturnValue(new Set());
    generateSlotsForProfessional.mockReturnValue([]);

    await appointmentService.generateAvailableSlots(7, '2026-03-16', null);

    expect(people.getActiveProfessionalByCod).toHaveBeenCalledWith(7);
  });

  it('retorna arreglo vacío si el codProf especificado no existe', async () => {
    people.getActiveProfessionalByCod.mockResolvedValue(null);
    Appointment.findAll.mockResolvedValue([]);
    buildBusyKeys.mockReturnValue(new Set());

    const slots = await appointmentService.generateAvailableSlots(999, '2026-03-16', null);

    expect(slots).toEqual([]);
  });
});

describe('appointment.service.findFirstAvailableBySpeciality', () => {
  it('salta fines de semana y festivos hasta encontrar un slot', async () => {
    dateUtils.todayStr.mockReturnValue('2026-03-14'); // sábado
    dateUtils.addDays.mockImplementation((d) => d); // no relevante para el límite en este test
    dateUtils.isBeforeDate.mockReturnValue(true);
    dateUtils.isWeekend.mockReturnValueOnce(true).mockReturnValueOnce(false);
    festivos.esFestivo.mockReturnValue(false);
    people.getActiveProfessionalsBySpeciality.mockResolvedValue([{ codProf: 1 }]);
    Appointment.findAll.mockResolvedValue([]);
    generateSlotsForProfessional.mockReturnValue([{ timeApp: '08:00', codProf: 1 }]);

    const result = await appointmentService.findFirstAvailableBySpeciality('General');

    expect(result).toEqual({ timeApp: '08:00', codProf: 1 });
  });

  it('retorna null si no hay slots disponibles antes del límite de búsqueda', async () => {
    dateUtils.todayStr.mockReturnValue('2026-03-16');
    dateUtils.addDays.mockReturnValue('2026-05-15');
    dateUtils.isBeforeDate.mockReturnValue(false); // se sale del while inmediatamente
    festivos.esFestivo.mockReturnValue(false);
    dateUtils.isWeekend.mockReturnValue(false);

    const result = await appointmentService.findFirstAvailableBySpeciality('General');

    expect(result).toBeNull();
  });
});

describe('appointment.service.exportByIds', () => {
  it('enriquece las citas encontradas y delega al export.service', async () => {
    Appointment.findAll.mockResolvedValue([
      { codApp: 1, codPatient: 10, codProf: 20, dateApp: '2026-03-16', timeApp: '09:00', statusApp: 'Scheduled' },
    ]);
    people.getPatientByCod.mockResolvedValue({ namePatient: 'Ana', lastNamePatient: 'Ruiz' });
    people.getActiveProfessionalByCod.mockResolvedValue({
      nameProf: 'Luis',
      lastNameProf: 'Gómez',
      specialityProf: 'General',
      typeProf: 'Doctor',
    });
    exportService.exportAppointments.mockReturnValue('contenido-csv');
    exportService.getContentType.mockReturnValue('text/csv');
    exportService.getFileExtension.mockReturnValue('csv');

    const result = await appointmentService.exportByIds([1], 'csv');

    expect(exportService.exportAppointments).toHaveBeenCalledWith(
      [expect.objectContaining({ patientName: 'Ana Ruiz', professionalName: 'Luis Gómez' })],
      'csv'
    );
    expect(result).toEqual({ content: 'contenido-csv', contentType: 'text/csv', extension: 'csv' });
  });
});
