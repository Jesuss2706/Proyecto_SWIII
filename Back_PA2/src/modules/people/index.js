require('./people.listeners'); // registra los listeners al cargar el módulo
const routes = require('./people.routes');

// Otros módulos (appointment) no deben importar patient.model.js / professional.model.js
// directamente. Si necesitan datos de people, se comunican vía eventBus
// (patient.registered, patient.updated, professional.registered, professional.updated).
module.exports = { routes };
