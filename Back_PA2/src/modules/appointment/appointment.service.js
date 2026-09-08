const { Op } = require('sequelize');
const Appointment = require('./appointment.model');
const people = require('../people');
const { generateSlotsForProfessional, buildBusyKeys } = require('./slot-generator');
const dateUtils = require('./date-utils');
const festivos = require('./festivos');
const exportService = require('./export/export.service');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

function canReschedule(status) {
  return status !== 'Cancelled' && status !== 'Completed';
}
function canCancel(status) {
  return status !== 'Completed';
}
function canComplete(status) {
  return status !== 'Cancelled';
}

async function create(dto) {
  const patient = await people.getPatientByCod(dto.codPatient);
  if (!patient) throw new NotFoundError(`No existe el paciente con código: ${dto.codPatient}`);

  const professional = await people.getActiveProfessionalByCod(dto.codProf);
  if (!professional) throw new NotFoundError(`No existe el profesional con código: ${dto.codProf}`);

  const hasScheduled = await Appointment.findOne({
    where: { codPatient: dto.codPatient, statusApp: 'Scheduled' },
  });
  if (hasScheduled) {
    throw new BadRequestError(
      'El paciente ya tiene una cita agendada. No puede agendar otra hasta que la cita actual sea completada o cancelada.'
    );
  }

  return Appointment.create({
    codProf: dto.codProf,
    codPatient: dto.codPatient,
    dateApp: dto.dateApp,
    timeApp: dto.timeApp,
    descApp: dto.descApp,
    statusApp: 'Scheduled',
  });
}

async function findById(id) {
  return Appointment.findByPk(id);
}

async function findAll() {
  return Appointment.findAll();
}

async function findByCodProf(codProf) {
  return Appointment.findAll({ where: { codProf } });
}

async function findByCodPatient(codPatient) {
  return Appointment.findAll({ where: { codPatient } });
}

async function findByStatus(status) {
  return Appointment.findAll({ where: { statusApp: status } });
}

async function findByCodProfAndDate(codProf, date) {
  return Appointment.findAll({ where: { codProf, dateApp: date } });
}

async function findByDateApp(date) {
  return Appointment.findAll({ where: { dateApp: date } });
}

async function findBySpecialityProf(speciality) {
  const professionals = await people.getActiveProfessionalsBySpeciality(speciality);
  const codProfs = professionals.map((p) => p.codProf);
  if (codProfs.length === 0) return [];
  return Appointment.findAll({ where: { codProf: { [Op.in]: codProfs } } });
}

async function update(id, dto) {
  const appointment = await Appointment.findByPk(id);
  if (!appointment) throw new NotFoundError(`Cita no encontrada con id: ${id}`);

  if (dto.dateApp != null || dto.timeApp != null) {
    if (!canReschedule(appointment.statusApp)) {
      throw new BadRequestError('No se puede reagendar una cita cancelada o completada');
    }
    if (dto.dateApp != null) appointment.dateApp = dto.dateApp;
    if (dto.timeApp != null) appointment.timeApp = dto.timeApp;
  }

  if (dto.descApp != null) {
    appointment.descApp = dto.descApp;
  }

  if (dto.statusApp != null && dto.statusApp !== appointment.statusApp) {
    if (dto.statusApp === 'Cancelled') {
      if (!canCancel(appointment.statusApp)) throw new BadRequestError('No se puede cancelar una cita completada');
      appointment.statusApp = 'Cancelled';
    } else if (dto.statusApp === 'Completed') {
      if (!canComplete(appointment.statusApp)) throw new BadRequestError('No se puede completar una cita cancelada');
      appointment.statusApp = 'Completed';
    } else {
      appointment.statusApp = dto.statusApp;
    }
  }

  await appointment.save();
  return appointment;
}

async function cancel(id) {
  const appointment = await Appointment.findByPk(id);
  if (!appointment) return false;
  if (!canCancel(appointment.statusApp)) {
    throw new BadRequestError('No se puede cancelar una cita completada');
  }
  appointment.statusApp = 'Cancelled';
  await appointment.save();
  return true;
}

async function resolveProfessionals(codProf, speciality) {
  if (codProf != null) {
    const prof = await people.getActiveProfessionalByCod(codProf);
    return prof ? [prof] : [];
  }
  if (speciality != null) {
    return people.getActiveProfessionalsBySpeciality(speciality);
  }
  return people.getAllActiveProfessionals();
}

async function generateAvailableSlots(codProf, date, speciality) {
  const targetDate = date || dateUtils.todayStr();
  const professionals = await resolveProfessionals(codProf, speciality);

  const occupied = await Appointment.findAll({
    where: { dateApp: targetDate, statusApp: { [Op.ne]: 'Cancelled' } },
  });
  const busyKeys = buildBusyKeys(occupied);

  const slots = [];
  for (const prof of professionals) {
    slots.push(...generateSlotsForProfessional(prof, targetDate, busyKeys, true));
  }
  return slots;
}

async function generateBySpeciality(speciality) {
  return generateAvailableSlots(null, dateUtils.todayStr(), speciality);
}

async function findFirstAvailableBySpeciality(speciality) {
  let searchDate = dateUtils.todayStr();
  const limitDate = dateUtils.addDays(searchDate, 60);

  while (dateUtils.isBeforeDate(searchDate, limitDate)) {
    if (dateUtils.isWeekend(searchDate) || festivos.esFestivo(searchDate)) {
      searchDate = dateUtils.addDays(searchDate, 1);
      continue;
    }

    const professionals = await people.getActiveProfessionalsBySpeciality(speciality);
    const occupied = await Appointment.findAll({
      where: { dateApp: searchDate, statusApp: { [Op.ne]: 'Cancelled' } },
    });
    const busyKeys = buildBusyKeys(occupied);

    for (const prof of professionals) {
      const slots = generateSlotsForProfessional(prof, searchDate, busyKeys, false);
      if (slots.length > 0) return slots[0];
    }

    searchDate = dateUtils.addDays(searchDate, 1);
  }

  return null;
}

async function enrichForExport(appointment) {
  const [patient, professional] = await Promise.all([
    people.getPatientByCod(appointment.codPatient),
    people.getActiveProfessionalByCod(appointment.codProf),
  ]);

  return {
    codApp: appointment.codApp,
    patientName: patient ? `${patient.namePatient} ${patient.lastNamePatient}`.trim() : '',
    professionalName: professional ? `${professional.nameProf} ${professional.lastNameProf}`.trim() : '',
    specialityProf: professional ? professional.specialityProf : '',
    typeProf: professional ? professional.typeProf : '',
    dateApp: appointment.dateApp,
    timeApp: appointment.timeApp,
    statusApp: appointment.statusApp,
    descApp: appointment.descApp,
  };
}

async function exportByIds(ids, format) {
  const found = await Appointment.findAll({ where: { codApp: { [Op.in]: ids } } });
  const enriched = await Promise.all(found.map(enrichForExport));

  return {
    content: exportService.exportAppointments(enriched, format),
    contentType: exportService.getContentType(format),
    extension: exportService.getFileExtension(format),
  };
}

module.exports = {
  create,
  findById,
  findAll,
  findByCodProf,
  findByCodPatient,
  findByStatus,
  findByCodProfAndDate,
  findByDateApp,
  findBySpecialityProf,
  update,
  cancel,
  generateAvailableSlots,
  generateBySpeciality,
  findFirstAvailableBySpeciality,
  exportByIds,
};
