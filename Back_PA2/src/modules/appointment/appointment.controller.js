const appointmentService = require('./appointment.service');
const dateUtils = require('./date-utils');
const { required } = require('../../shared/validate');
const { BadRequestError } = require('../../shared/errors');

function sendListOrNoContent(res, list) {
  if (!list || list.length === 0) return res.status(204).send();
  return res.json(list);
}

async function findAll(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findAll());
  } catch (err) {
    next(err);
  }
}

async function getGeneratedAppointments(req, res, next) {
  try {
    const { codProf, date, speciality } = req.query;
    const targetDate = date || dateUtils.todayStr();
    const slots = await appointmentService.generateAvailableSlots(codProf, targetDate, speciality);
    sendListOrNoContent(res, slots);
  } catch (err) {
    next(err);
  }
}

async function findById(req, res, next) {
  try {
    const appointment = await appointmentService.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: `No se encontró la cita con id: ${req.params.id}` });
    }
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function findByCodProf(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findByCodProf(req.params.codProf));
  } catch (err) {
    next(err);
  }
}

async function findByCodPatient(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findByCodPatient(req.params.codPatient));
  } catch (err) {
    next(err);
  }
}

async function findByStatus(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findByStatus(req.params.status));
  } catch (err) {
    next(err);
  }
}

async function findByCodProfAndDate(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findByCodProfAndDate(req.params.codProf, req.params.date));
  } catch (err) {
    next(err);
  }
}

async function findByDate(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findByDateApp(req.params.date));
  } catch (err) {
    next(err);
  }
}

async function findBySpecialityProf(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.findBySpecialityProf(req.params.specialityProf));
  } catch (err) {
    next(err);
  }
}

async function findFirstAvailable(req, res, next) {
  try {
    const slot = await appointmentService.findFirstAvailableBySpeciality(req.params.speciality);
    if (!slot) return res.status(204).send();
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

async function generateBySpeciality(req, res, next) {
  try {
    sendListOrNoContent(res, await appointmentService.generateBySpeciality(req.params.speciality));
  } catch (err) {
    next(err);
  }
}

async function exportAppointments(req, res, next) {
  try {
    const format = req.query.format;
    const ids = req.body;
    if (!format) throw new BadRequestError("El parámetro 'format' es obligatorio");
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(204).send();
    }

    const { content, contentType, extension } = await appointmentService.exportByIds(ids, format);
    res
      .status(200)
      .type(contentType)
      .set('Content-Disposition', `attachment; filename="citas_export${extension}"`)
      .send(content);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const errors = required(req.body, ['codProf', 'codPatient', 'dateApp', 'timeApp']);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const appointment = await appointmentService.create(req.body);
    res.status(201).location(`/api/appointments/${appointment.codApp}`).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const appointment = await appointmentService.update(req.params.id, req.body);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { STATUS_ALIASES } = require('./appointment.enums');
    const newStatusStr = req.body.statusApp;
    if (!newStatusStr) throw new BadRequestError("Falta el campo 'statusApp'");

    const mapped = STATUS_ALIASES[String(newStatusStr).toUpperCase()];
    if (!mapped) throw new BadRequestError(`Estado no válido: ${newStatusStr}`);

    const appointment = await appointmentService.update(req.params.id, { statusApp: mapped });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const cancelled = await appointmentService.cancel(req.params.id);
    if (!cancelled) {
      return res.status(404).json({ error: `No se encontró la cita con id: ${req.params.id}` });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  findAll,
  getGeneratedAppointments,
  findById,
  findByCodProf,
  findByCodPatient,
  findByStatus,
  findByCodProfAndDate,
  findByDate,
  findBySpecialityProf,
  findFirstAvailable,
  generateBySpeciality,
  exportAppointments,
  create,
  update,
  updateStatus,
  cancel,
};
