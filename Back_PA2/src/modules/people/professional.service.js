const Professional = require('./professional.model');
const { User } = require('../auth');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

// Nunca se debe exponer passUser, securityQuestion ni securityAnswer a través
// de esta asociación: solo los campos que el front necesita mostrar.
const USER_PUBLIC_ATTRS = ['codUser', 'cedUser', 'nameUser', 'secondNameUser', 'lastNameUser', 'secondLastNameUser', 'statusUser', 'roleUser'];
const includeUser = { association: 'user', attributes: USER_PUBLIC_ATTRS };

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
    imageProf: dto.imageProf || null,
    statusProf: 'Active',
  });

  // Releer con el include para no filtrar campos sensibles del User en la respuesta
  return Professional.findByPk(prof.codProf, { include: includeUser });
}

async function findAll() {
  return Professional.findAll({ include: includeUser });
}

async function findByCodUser(codUser) {
  const user = await User.findByPk(codUser);
  if (!user) throw new NotFoundError(`Usuario no encontrado: ${codUser}`);
  return Professional.findOne({ where: { codUser }, include: includeUser });
}

async function findBySpeciality(speciality) {
  return Professional.findAll({ where: { specialityProf: speciality }, include: includeUser });
}

async function findByCodProf(codProf) {
  return Professional.findByPk(codProf, { include: includeUser });
}

async function update(id, dto) {
  const prof = await Professional.findByPk(id, { include: includeUser });
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
  if (dto.imageProf !== undefined) prof.imageProf = dto.imageProf || null;

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
