const Patient = require('./patient.model');
const eventBus = require('../../shared/eventBus');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

function toPatientEvent(patient) {
  return {
    codPatient: patient.codPatient,
    idPatient: Number(patient.idPatient),
    namePatient: patient.namePatient,
    secondNamePatient: patient.secondNamePatient,
    lastNamePatient: patient.lastNamePatient,
    secondLastNamePatient: patient.secondLastNamePatient,
    phonePatient: patient.phonePatient != null ? Number(patient.phonePatient) : null,
    genderPatient: patient.genderPatient,
  };
}

async function register(dto) {
  const exists = await Patient.findOne({ where: { idPatient: dto.idPatient } });
  if (exists) {
    throw new BadRequestError('Ya existe un paciente con esa identificación');
  }

  const patient = await Patient.create({
    idPatient: dto.idPatient,
    namePatient: dto.namePatient,
    secondNamePatient: dto.secondNamePatient,
    lastNamePatient: dto.lastNamePatient,
    secondLastNamePatient: dto.secondLastNamePatient,
    phonePatient: dto.phonePatient,
    dateBirthPatient: dto.dateBirthPatient,
    genderPatient: dto.genderPatient,
  });

  // appointment (u otro módulo) puede escuchar esto para su propia lógica
  eventBus.emit('patient.registered', toPatientEvent(patient));
  return patient;
}

async function findAll() {
  return Patient.findAll();
}

async function findByIdPatient(idPatient) {
  return Patient.findOne({ where: { idPatient } });
}

async function findByCodPatient(codPatient) {
  return Patient.findByPk(codPatient);
}

async function update(id, dto) {
  const patient = await Patient.findByPk(id);
  if (!patient) throw new NotFoundError('Paciente no encontrado');

  if (dto.namePatient != null) patient.namePatient = dto.namePatient;
  if (dto.secondNamePatient != null) patient.secondNamePatient = dto.secondNamePatient;
  if (dto.lastNamePatient != null) patient.lastNamePatient = dto.lastNamePatient;
  if (dto.secondLastNamePatient != null) patient.secondLastNamePatient = dto.secondLastNamePatient;
  if (dto.phonePatient != null) patient.phonePatient = dto.phonePatient;
  if (dto.dateBirthPatient != null) patient.dateBirthPatient = dto.dateBirthPatient;
  if (dto.genderPatient != null) patient.genderPatient = dto.genderPatient;

  await patient.save();
  eventBus.emit('patient.updated', toPatientEvent(patient));
  return patient;
}

async function remove(id) {
  const deleted = await Patient.destroy({ where: { codPatient: id } });
  if (!deleted) throw new NotFoundError('Paciente no encontrado');
}

module.exports = { register, findAll, findByIdPatient, findByCodPatient, update, remove };
