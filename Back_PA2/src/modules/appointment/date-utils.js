const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Parsea "YYYY-MM-DD" a componentes sin pasar por Date (evita corrimientos de UTC).
function parts(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function dayOfWeekName(dateStr) {
  const { year, month, day } = parts(dateStr);
  // Usamos mediodía UTC para evitar que el cambio de zona horaria empuje la fecha al día anterior/siguiente.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return DAY_NAMES[date.getUTCDay()];
}

function isWeekend(dateStr) {
  const day = dayOfWeekName(dateStr);
  return day === 'SATURDAY' || day === 'SUNDAY';
}

function addDays(dateStr, amount) {
  const { year, month, day } = parts(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + amount);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isBeforeDate(a, b) {
  return a < b; // funciona por comparación lexicográfica en formato YYYY-MM-DD
}

module.exports = { todayStr, dayOfWeekName, isWeekend, addDays, isBeforeDate };
