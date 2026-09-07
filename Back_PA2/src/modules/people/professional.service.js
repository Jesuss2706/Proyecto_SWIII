const Professional = require('./professional.model');
const UserRef = require('./userRef.model');
const eventBus = require('../../shared/eventBus');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

function toProfessionalEvent(prof) {
  const userRef = prof.userRef;
  return {
    codProf: prof.codProf,
    nameProf: userRef ? userRef.nameUser || '' : '',
    lastNameProf: userRef ? userRef.lastNameUser || '' : '',
    specialityProf: prof.specialityProf,
    typeProf: prof.typeProf,
    arrivalTime: prof.arrivalTime,
    departureTime: prof.departureTime,
    attentionInterval: prof.attentionInterval ?? 30,
    unavailableDays: prof.unavailableDays,
  };
}

function assertValidSchedule(arrivalTime, departureTime) {
  if (arrivalTime && departureTime && arrivalTime >= departureTime) {
    throw new BadRequestError('La hora de llegada no puede ser mayor que la de salida');
  }
}

async function register(dto) {
  const userRef = await UserRef.findByPk(dto.codUser);
  if (!userRef) {
    throw new NotFoundError('No existe un usuario con ese código');
  }

  const exists = await Professional.findOne({ where: { codUser: dto.codUser } });
  if (exists) {
    throw new BadRequestError('Ya existe un profesional con ese usuario');
  }

  assertValidSchedule(dto.arrivalTime, dto.departureTime);

  const prof = await Professional.create({
    codUser: dto.codUser,
    genProf: dto.genProf,
    phoneProf: dto.phoneProf,
    typeProf: dto.typeProf,
    specialityProf: dto.specialityProf,
    arrivalTime: dto.arrivalTime,
    departureTime: dto.departureTime,
    attentionInterval: dto.attentionInterval,
    unavailableDays: dto.unavailableDays,
    statusProf: 'Active',
  });
  prof.userRef = userRef;

  eventBus.emit('professional.registered', toProfessionalEvent(prof));
  return prof;
}

async function findAll() {
  return Professional.findAll({ include: 'userRef' });
}

async function findByCodUser(codUser) {
  const userRef = await UserRef.findByPk(codUser);
  if (!userRef) throw new NotFoundError(`Usuario no encontrado: ${codUser}`);
  return Professional.findOne({ where: { codUser }, include: 'userRef' });
}

async function findBySpeciality(speciality) {
  return Professional.findAll({ where: { specialityProf: speciality }, include: 'userRef' });
}

async function findByCodProf(codProf) {
  return Professional.findByPk(codProf, { include: 'userRef' });
}

async function update(id, dto) {
  const prof = await Professional.findByPk(id, { include: 'userRef' });
  if (!prof) throw new NotFoundError('Profesional no encontrado');

  if (dto.genProf != null) prof.genProf = dto.genProf;
  if (dto.phoneProf != null) prof.phoneProf = dto.phoneProf;
  if (dto.typeProf != null) prof.typeProf = dto.typeProf;
  if (dto.specialityProf != null) prof.specialityProf = dto.specialityProf;
  if (dto.arrivalTime != null) prof.arrivalTime = dto.arrivalTime;
  if (dto.departureTime != null) prof.departureTime = dto.departureTime;

  assertValidSchedule(prof.arrivalTime, prof.departureTime);

  if (dto.attentionInterval != null) prof.attentionInterval = dto.attentionInterval;
  if (dto.unavailableDays != null) prof.unavailableDays = dto.unavailableDays;

  await prof.save();
  eventBus.emit('professional.updated', toProfessionalEvent(prof));
  return prof;
}

async function deactivate(id) {
  const prof = await Professional.findByPk(id);
  if (!prof) throw new NotFoundError('Profesional no encontrado');
  prof.statusProf = 'Inactive';
  await prof.save();
}

module.exports = {
  register,
  findAll,
  findByCodUser,
  findBySpeciality,
  findByCodProf,
  update,
  deactivate,
};
