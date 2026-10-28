jest.mock('../patient.model', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
}));

const Patient = require('../patient.model');
const patientService = require('../patient.service');
const { BadRequestError, NotFoundError } = require('../../../shared/errors');

describe('patient.service.register', () => {
  it('lanza BadRequestError si ya existe un paciente con esa identificación', async () => {
    Patient.findOne.mockResolvedValue({ codPatient: 1 });

    await expect(patientService.register({ idPatient: 123 })).rejects.toThrow(BadRequestError);
  });

  it('crea el paciente cuando la identificación no existe', async () => {
    Patient.findOne.mockResolvedValue(null);
    Patient.create.mockResolvedValue({ codPatient: 1, idPatient: 123 });

    const result = await patientService.register({ idPatient: 123, namePatient: 'Ana' });

    expect(Patient.create).toHaveBeenCalledWith(expect.objectContaining({ idPatient: 123 }));
    expect(result.codPatient).toBe(1);
  });
});

describe('patient.service.update', () => {
  it('lanza NotFoundError si el paciente no existe', async () => {
    Patient.findByPk.mockResolvedValue(null);
    await expect(patientService.update(1, {})).rejects.toThrow(NotFoundError);
  });

  it('actualiza solo los campos provistos (deja los demás intactos)', async () => {
    const patient = {
      namePatient: 'Viejo',
      phonePatient: '3000000000',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Patient.findByPk.mockResolvedValue(patient);

    const result = await patientService.update(1, { namePatient: 'Nuevo' });

    expect(result.namePatient).toBe('Nuevo');
    expect(result.phonePatient).toBe('3000000000'); // no se tocó
    expect(patient.save).toHaveBeenCalled();
  });
});

describe('patient.service.remove', () => {
  it('lanza NotFoundError si no se eliminó ningún registro', async () => {
    Patient.destroy.mockResolvedValue(0);
    await expect(patientService.remove(1)).rejects.toThrow(NotFoundError);
  });

  it('no lanza error cuando el registro se elimina correctamente', async () => {
    Patient.destroy.mockResolvedValue(1);
    await expect(patientService.remove(1)).resolves.toBeUndefined();
  });
});

describe('patient.service.findByIdPatient / findByCodPatient', () => {
  it('busca por número de identificación', async () => {
    Patient.findOne.mockResolvedValue({ idPatient: 123 });
    const result = await patientService.findByIdPatient(123);
    expect(Patient.findOne).toHaveBeenCalledWith({ where: { idPatient: 123 } });
    expect(result).toEqual({ idPatient: 123 });
  });

  it('busca por código interno', async () => {
    Patient.findByPk.mockResolvedValue({ codPatient: 5 });
    const result = await patientService.findByCodPatient(5);
    expect(Patient.findByPk).toHaveBeenCalledWith(5);
    expect(result).toEqual({ codPatient: 5 });
  });
});
