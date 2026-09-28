jest.mock('../professional.model', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../auth', () => ({
  User: { findByPk: jest.fn() },
}));

const Professional = require('../professional.model');
const { User } = require('../../auth');
const professionalService = require('../professional.service');
const { BadRequestError, NotFoundError } = require('../../../shared/errors');

describe('professional.service.register', () => {
  const dto = { codUser: 1, arrivalTime: '08:00', departureTime: '16:00' };

  it('lanza NotFoundError si el usuario asociado no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(professionalService.register(dto)).rejects.toThrow(NotFoundError);
  });

  it('lanza BadRequestError si ya existe un profesional para ese usuario', async () => {
    User.findByPk.mockResolvedValue({ codUser: 1 });
    Professional.findOne.mockResolvedValue({ codProf: 5 });

    await expect(professionalService.register(dto)).rejects.toThrow(BadRequestError);
  });

  it('lanza BadRequestError si la hora de llegada no es menor que la de salida', async () => {
    User.findByPk.mockResolvedValue({ codUser: 1 });
    Professional.findOne.mockResolvedValue(null);

    await expect(
      professionalService.register({ ...dto, arrivalTime: '17:00', departureTime: '08:00' })
    ).rejects.toThrow(BadRequestError);
  });

  it('crea el profesional y lo retorna con el include del usuario', async () => {
    User.findByPk.mockResolvedValue({ codUser: 1 });
    Professional.findOne.mockResolvedValue(null);
    Professional.create.mockResolvedValue({ codProf: 10 });
    Professional.findByPk.mockResolvedValue({ codProf: 10, user: { codUser: 1 } });

    const result = await professionalService.register(dto);

    expect(Professional.create).toHaveBeenCalledWith(
      expect.objectContaining({ codUser: 1, statusProf: 'Active' })
    );
    expect(result).toEqual({ codProf: 10, user: { codUser: 1 } });
  });
});

describe('professional.service.findByCodUser', () => {
  it('lanza NotFoundError si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(professionalService.findByCodUser(1)).rejects.toThrow(NotFoundError);
  });

  it('retorna el profesional asociado al usuario', async () => {
    User.findByPk.mockResolvedValue({ codUser: 1 });
    Professional.findOne.mockResolvedValue({ codProf: 3 });

    const result = await professionalService.findByCodUser(1);

    expect(result).toEqual({ codProf: 3 });
  });
});

describe('professional.service.update', () => {
  it('lanza NotFoundError si el profesional no existe', async () => {
    Professional.findByPk.mockResolvedValue(null);
    await expect(professionalService.update(1, {})).rejects.toThrow(NotFoundError);
  });

  it('lanza BadRequestError si la nueva franja horaria es inválida', async () => {
    const prof = { arrivalTime: '08:00', departureTime: '16:00', save: jest.fn() };
    Professional.findByPk.mockResolvedValue(prof);

    await expect(
      professionalService.update(1, { arrivalTime: '18:00' })
    ).rejects.toThrow(BadRequestError);
  });

  it('actualiza los campos de agenda cuando son válidos', async () => {
    const prof = {
      arrivalTime: '08:00',
      departureTime: '16:00',
      attentionInterval: 30,
      unavailableDays: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    Professional.findByPk.mockResolvedValue(prof);

    const result = await professionalService.update(1, {
      attentionInterval: 45,
      unavailableDays: 'SATURDAY',
    });

    expect(result.attentionInterval).toBe(45);
    expect(result.unavailableDays).toBe('SATURDAY');
    expect(prof.save).toHaveBeenCalled();
  });
});

describe('professional.service.deactivate', () => {
  it('lanza NotFoundError si el profesional no existe', async () => {
    Professional.findByPk.mockResolvedValue(null);
    await expect(professionalService.deactivate(1)).rejects.toThrow(NotFoundError);
  });

  it('marca al profesional como Inactive', async () => {
    const prof = { statusProf: 'Active', save: jest.fn().mockResolvedValue(undefined) };
    Professional.findByPk.mockResolvedValue(prof);

    await professionalService.deactivate(1);

    expect(prof.statusProf).toBe('Inactive');
    expect(prof.save).toHaveBeenCalled();
  });
});
