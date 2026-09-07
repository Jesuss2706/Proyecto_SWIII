function nullSafe(value) {
  return value != null ? String(value) : '';
}

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function resolveAlert(status) {
  switch (status) {
    case 'Cancelled':
      return 'Cita cancelada';
    case 'Rescheduled':
      return 'Cita reagendada';
    case 'Completed':
      return 'Cita completada';
    default:
      return '';
  }
}

module.exports = { nullSafe, timestamp, resolveAlert };
