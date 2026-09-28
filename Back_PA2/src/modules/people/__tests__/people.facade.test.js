jest.mock('../patient.model', () => ({ findByPk: jest.fn() }));
jest.mock('../professional.model', () => ({ findByPk: jest.fn(), findAll: jest.fn() }));

const Patient = require('../patient.model');
const Professional = require('../professional.model');
const facade = require('../people.facade');

describe('people.facade.getPatientByCod', () => {
  it('retorna null si el paciente no existe', async () => {
    Patient.findByPk.mockResolvedValue(null);
    expect(await facade.getPatientByCod(1)).toBeNull();
  });

  it('mapea el paciente combinando nombre y apellido compuestos y castea tipos', async () => {
    Patient.findByPk.mockResolvedValue({
      codPatient: 1,
      idPatient: '123',
      namePatient: 'Ana',
      secondNamePatient: 'María',
      lastNamePatient: 'Ruiz',
      secondLastNamePatient: null,
      phonePatient: '3001234567',
      genderPatient: 'F',
    });

    const result = await facade.getPatientByCod(1);

    expect(result).toEqual({
      codPatient: 1,
      idPatient: 123,
      namePatient: 'Ana María',
      lastNamePatient: 'Ruiz',
      phonePatient: 3001234567,
      genderPatient: 'F',
    });
  });
});

describe('people.facade.getActiveProfessionalByCod', () => {
  it('retorna null si el profesional no existe', async () => {
    Professional.findByPk.mockResolvedValue(null);
    expect(await facade.getActiveProfessionalByCod(1)).toBeNull();
  });

  it('retorna null si el profesional existe pero está inactivo', async () => {
    Professional.findByPk.mockResolvedValue({ statusProf: 'Inactive' });
    expect(await facade.getActiveProfessionalByCod(1)).toBeNull();
  });

  it('mapea un profesional activo incluyendo el nombre del usuario asociado', async () => {
    Professional.findByPk.mockResolvedValue({
      codProf: 1,
      statusProf: 'Active',
      specialityProf: 'General',
      typeProf: 'Doctor',
      arrivalTime: '08:00',
      departureTime: '16:00',
      attentionInterval: 30,
      unavailableDays: null,
      imageProf: null,
      user: { nameUser: 'Luis', secondNameUser: null, lastNameUser: 'Gómez', secondLastNameUser: null },
    });

    const result = await facade.getActiveProfessionalByCod(1);

    expect(result.nameProf).toBe('Luis');
    expect(result.lastNameProf).toBe('Gómez');
  });

  it('usa 30 como intervalo de atención por defecto si no está definido', async () => {
    Professional.findByPk.mockResolvedValue({
      codProf: 1,
      statusProf: 'Active',
      attentionInterval: undefined,
      user: null,
    });

    const result = await facade.getActiveProfessionalByCod(1);
    expect(result.attentionInterval).toBe(30);
  });
});

describe('people.facade.getActiveProfessionalsBySpeciality', () => {
  it('filtra por estado Active y especialidad, mapeando cada resultado', async () => {
    Professional.findAll.mockResolvedValue([
      { codProf: 1, user: null, attentionInterval: 30 },
      { codProf: 2, user: null, attentionInterval: 30 },
    ]);

    const result = await facade.getActiveProfessionalsBySpeciality('General');

    expect(Professional.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { statusProf: 'Active', specialityProf: 'General' } })
    );
    expect(result).toHaveLength(2);
  });
});
