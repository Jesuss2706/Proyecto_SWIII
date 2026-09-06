const professionalService = require('./professional.service');
const { required, oneOf } = require('../../shared/validate');
const { SPECIALITIES, TYPES } = require('./people.enums');
const { BadRequestError } = require('../../shared/errors');

async function findAll(req, res, next) {
  try {
    const professionals = await professionalService.findAll();
    if (professionals.length === 0) return res.status(204).send();
    res.json(professionals);
  } catch (err) {
    next(err);
  }
}

async function findByCodUser(req, res, next) {
  try {
    const prof = await professionalService.findByCodUser(req.params.codUser);
    if (!prof) {
      return res.status(404).json({ error: `No se encontró el profesional con codUser: ${req.params.codUser}` });
    }
    res.json(prof);
  } catch (err) {
    next(err);
  }
}

async function findBySpeciality(req, res, next) {
  try {
    const error = oneOf(req.params.speciality, SPECIALITIES, 'speciality');
    if (error) throw new BadRequestError(error);

    const professionals = await professionalService.findBySpeciality(req.params.speciality);
    if (professionals.length === 0) return res.status(204).send();
    res.json(professionals);
  } catch (err) {
    next(err);
  }
}

async function findByCodigo(req, res, next) {
  try {
    const prof = await professionalService.findByCodProf(req.params.codigo);
    if (!prof) {
      return res.status(404).json({ error: `No se encontró el profesional con codigo: ${req.params.codigo}` });
    }
    res.json(prof);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const errors = [
      ...required(req.body, ['codUser', 'genProf', 'typeProf', 'specialityProf', 'arrivalTime', 'departureTime', 'attentionInterval']),
    ];
    const typeError = oneOf(req.body.typeProf, TYPES, 'typeProf');
    const specError = oneOf(req.body.specialityProf, SPECIALITIES, 'specialityProf');
    if (typeError) errors.push(typeError);
    if (specError) errors.push(specError);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const prof = await professionalService.register(req.body);
    res.status(201).location(`/api/people/professionals/${prof.codProf}`).json(prof);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const prof = await professionalService.update(req.params.id, req.body);
    res.json(prof);
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    await professionalService.deactivate(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { findAll, findByCodUser, findBySpeciality, findByCodigo, register, update, deactivate };
