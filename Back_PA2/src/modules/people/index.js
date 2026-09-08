require('./people.listeners'); // registra los listeners al cargar el módulo
const routes = require('./people.routes');
const facade = require('./people.facade');
const enums = require('./people.enums');

// Otros módulos (appointment) no deben importar patient.model.js / professional.model.js
// directamente — solo pueden usar lo que se expone aquí. Como todo vive en el
// mismo proceso, no hace falta duplicar estos datos vía eventos: una llamada
// directa a la fachada siempre trae el dato más reciente.
module.exports = { routes, enums, ...facade };
