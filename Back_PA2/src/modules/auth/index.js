const routes = require('./auth.routes');

// Ningún otro módulo debe hacer require() directo de auth.model.js
// o auth.service.js. Si necesitan algo de auth, se expone aquí explícitamente
// o se comunican mediante eventos (ver shared/eventBus.js).
module.exports = { routes };
