// registerWithAccount: crea la cuenta (Keycloak + auth.users) y el perfil profesional de una vez.

jest.mock('../professional.model', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../auth', () => ({
  User: { findByPk: jest.fn() },
  createStaffUser: jest.fn(),
}));

const Professional = require('../professional.model');
const { User, createStaffUser } = require('../../auth');
const professionalService = require('../professional.service');
const { BadRequestError } = require('../../../shared/errors');

const dto = {
  cedUser: 1061234567,
  passUser: 'Password123',
  email: 'laura@correo.com',
  nameUser: 'Laura',
  secondNameUser: 'Inés',
  lastNameUser: 'Gómez',
  secondLastNameUser: 'Paz',
  genProf: 'Femenino',
  phoneProf: '3001234567',
  typeProf: 'Doctor',
  specialityProf: 'Physiotherapy',
  arrivalTime: '08:00:00',
  departureTime: '16:00:00',
  attentionInterval: 30,
  unavailableDays: 'SATURDAY,SUNDAY',
};

describe('professional.service.registerWithAccount', () => {
  beforeEach(() => {
    createStaffUser.mockResolvedValue({ codUser: 40 });
    User.findByPk.mockResolvedValue({ codUser: 40 });
    Professional.findOne.mockResolvedValue(null);
    Professional.create.mockResolvedValue({ codProf: 7 });
    Professional.findByPk.mockResolvedValue({ codProf: 7, codUser: 40 });
  });

  it('valida el horario ANTES de crear la cuenta, para no dejar cuentas sueltas', async () => {
    await expect(
      professionalService.registerWithAccount({ ...dto, arrivalTime: '17:00:00', departureTime: '08:00:00' })
    ).rejects.toThrow(BadRequestError);

    expect(createStaffUser).not.toHaveBeenCalled();
    expect(Professional.create).not.toHaveBeenCalled();
  });

  it('crea la cuenta con rol Professional y le asocia el perfil', async () => {
    const result = await professionalService.registerWithAccount(dto);

    expect(createStaffUser).toHaveBeenCalledWith({
      role: 'Professional',
      cedUser: 1061234567,
      passUser: 'Password123',
      email: 'laura@correo.com',
      nameUser: 'Laura',
      secondNameUser: 'Inés',
      lastNameUser: 'Gómez',
      secondLastNameUser: 'Paz',
    });
    expect(Professional.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codUser: 40,
        specialityProf: 'Physiotherapy',
        unavailableDays: 'SATURDAY,SUNDAY',
        statusProf: 'Active',
      })
    );
    expect(result).toEqual({ codProf: 7, codUser: 40 });
  });

  it('no guarda datos de la cuenta (contraseña, correo) en el perfil profesional', async () => {
    await professionalService.registerWithAccount(dto);

    const saved = Professional.create.mock.calls[0][0];
    expect(saved).not.toHaveProperty('passUser');
    expect(saved).not.toHaveProperty('email');
  });

  it('si no se puede crear la cuenta (cédula repetida, Keycloak caído), no crea el perfil', async () => {
    createStaffUser.mockRejectedValue(new BadRequestError('Ya existe un usuario con esa cédula'));

    await expect(professionalService.registerWithAccount(dto)).rejects.toThrow('Ya existe un usuario');

    expect(Professional.create).not.toHaveBeenCalled();
  });
});