const STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'];

// Alias en español que aceptaba el endpoint PUT /:id/status del controller original
const STATUS_ALIASES = {
  ATENDIDA: 'Completed',
  CANCELADA: 'Cancelled',
  AGENDADA: 'Scheduled',
};

module.exports = { STATUSES, STATUS_ALIASES };
