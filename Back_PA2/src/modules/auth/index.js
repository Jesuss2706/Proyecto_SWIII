const routes = require('./auth.routes');
const User = require('./auth.model');

// Ningún otro módulo debe hacer require() directo de auth.service.js.
// Si necesitan algo de auth (como el modelo User para una asociación de
// Sequelize o una consulta de solo lectura), se expone aquí explícitamente.
// Al ser un monolito modular sobre una única base de datos, no hace falta
// duplicar estos datos por eventos: una consulta directa siempre trae lo
// más reciente.
module.exports = { routes, User };
