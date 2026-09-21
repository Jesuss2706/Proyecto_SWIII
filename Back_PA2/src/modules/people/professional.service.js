const Professional = require('./professional.model');
const { User } = require('../auth');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

function assertValidSchedule(arrivalTime, departureTime) {
  if (arrivalTime && departureTime && arrivalTime >= departureTime) {
    throw new BadRequestError('La hora de llegada no puede ser mayor que la de salida');
  }
}

async function register(dto) {
  const user = await User.findByPk(dto.codUser);
  if (!user) {
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
  prof.user = user;

  return prof;
}

async function findAll() {
  return Professional.findAll({ include: 'user' });
}

async function findByCodUser(codUser) {
  const user = await User.findByPk(codUser);
  if (!user) throw new NotFoundError(`Usuario no encontrado: ${codUser}`);
  return Professional.findOne({ where: { codUser }, include: 'user' });
}

async function findBySpeciality(speciality) {
  return Professional.findAll({ where: { specialityProf: speciality }, include: 'user' });
}

async function findByCodProf(codProf) {
  return Professional.findByPk(codProf, { include: 'user' });
}

async function update(id, dto) {
  const prof = await Professional.findByPk(id, { include: 'user' });
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
