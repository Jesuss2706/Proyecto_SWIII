const Patient = require('./patient.model');
const Professional = require('./professional.model');
const { buildFullName } = require('./people.utils');

// Nunca se debe exponer passUser, securityQuestion ni securityAnswer del User asociado.
const USER_PUBLIC_ATTRS = ['codUser', 'cedUser', 'nameUser', 'secondNameUser', 'lastNameUser', 'secondLastNameUser', 'statusUser', 'roleUser'];
const includeUser = { association: 'user', attributes: USER_PUBLIC_ATTRS };

async function getPatientByCod(codPatient) {
  const patient = await Patient.findByPk(codPatient);
  if (!patient) return null;

  return {
    codPatient: patient.codPatient,
    idPatient: Number(patient.idPatient),
    namePatient: buildFullName(patient.namePatient, patient.secondNamePatient),
    lastNamePatient: buildFullName(patient.lastNamePatient, patient.secondLastNamePatient),
    phonePatient: patient.phonePatient != null ? Number(patient.phonePatient) : null,
    genderPatient: patient.genderPatient,
  };
}

function mapProfessional(prof) {
  const user = prof.user;
  return {
    codProf: prof.codProf,
    nameProf: user ? buildFullName(user.nameUser, user.secondNameUser) : '',
    lastNameProf: user ? buildFullName(user.lastNameUser, user.secondLastNameUser) : '',
    specialityProf: prof.specialityProf,
    typeProf: prof.typeProf,
    arrivalTime: prof.arrivalTime,
    departureTime: prof.departureTime,
    attentionInterval: prof.attentionInterval ?? 30,
    unavailableDays: prof.unavailableDays,
    imageProf: prof.imageProf || null,
  };
}

// Solo profesionales activos son elegibles para agendar citas.
async function getActiveProfessionalByCod(codProf) {
  const prof = await Professional.findByPk(codProf, { include: includeUser });
  if (!prof || prof.statusProf !== 'Active') return null;
  return mapProfessional(prof);
}

async function getAllActiveProfessionals() {
  const list = await Professional.findAll({ where: { statusProf: 'Active' }, include: includeUser });
  return list.map(mapProfessional);
}

async function getActiveProfessionalsBySpeciality(speciality) {
  const list = await Professional.findAll({
    where: { statusProf: 'Active', specialityProf: speciality },
    include: includeUser,
  });
  return list.map(mapProfessional);
}

module.exports = {
  getPatientByCod,
  getActiveProfessionalByCod,
  getAllActiveProfessionals,
  getActiveProfessionalsBySpeciality,
};
