const { EventEmitter } = require('events');

/**
 * Bus de eventos interno de la aplicación.
 * Cada módulo publica eventos aquí (ej: "user.created") y otros módulos
 * se suscriben sin conocerse directamente entre sí.
 * Es el equivalente in-process a lo que antes hacía RabbitMQ entre microservicios.
 */
class AppEventBus extends EventEmitter {}

module.exports = new AppEventBus();
