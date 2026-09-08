const json = require('./json.strategy');
const csv = require('./csv.strategy');
const html = require('./html.strategy');
const { BadRequestError } = require('../../../shared/errors');

const strategies = {
  json,
  csv,
  html,
};

function resolveStrategy(format) {
  const strategy = strategies[String(format).toLowerCase()];
  if (!strategy) {
    throw new BadRequestError(
      `Formato de exportación no soportado: ${format}. Formatos válidos: ${Object.keys(strategies).join(', ')}`
    );
  }
  return strategy;
}

function exportAppointments(appointments, format) {
  return resolveStrategy(format).export(appointments);
}

function getContentType(format) {
  return resolveStrategy(format).contentType;
}

function getFileExtension(format) {
  return resolveStrategy(format).extension;
}

module.exports = { exportAppointments, getContentType, getFileExtension };
