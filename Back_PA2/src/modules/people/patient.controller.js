const patientService = require('./patient.service');
const { required } = require('../../shared/validate');
const { BadRequestError } = require('../../shared/errors');

async function findAll(req, res, next) {
  try {
    const patients = await patientService.findAll();
    if (patients.length === 0) return res.status(204).send();
    res.json(patients);
  } catch (err) {
    next(err);
  }
}

async function findById(req, res, next) {
  try {
    const patient = await patientService.findByIdPatient(req.params.idPatient);
    if (!patient) {
      return res.status(404).json({ error: `No se encontró el paciente con id: ${req.params.idPatient}` });
    }
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function findByCod(req, res, next) {
  try {
    const patient = await patientService.findByCodPatient(req.params.codPatient);
    if (!patient) {
      return res.status(404).json({ error: `No se encontró el paciente con id: ${req.params.codPatient}` });
    }
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const errors = required(req.body, ['idPatient', 'namePatient', 'lastNamePatient', 'genderPatient']);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const patient = await patientService.register(req.body);
    res.status(201).location(`/api/people/patients/${patient.codPatient}`).json(patient);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const patient = await patientService.update(req.params.id, req.body);
    res.json(patient);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await patientService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { findAll, findById, findByCod, register, update, remove };
