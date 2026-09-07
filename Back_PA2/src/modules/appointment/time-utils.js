// Todo el módulo trabaja las horas como strings "HH:mm" y las convierte
// a minutos desde medianoche para poder sumarlas/compararlas fácilmente.

// Postgres puede devolver TIME como "09:00:00"; normalizamos siempre a "HH:mm".
function normalize(hhmmss) {
  return hhmmss.split(':').slice(0, 2).join(':');
}

function toMinutes(hhmm) {
  const [h, m] = normalize(hhmm).split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function nowHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isBefore(a, b) {
  return toMinutes(a) < toMinutes(b);
}

function isAfter(a, b) {
  return toMinutes(a) > toMinutes(b);
}

module.exports = { toMinutes, toHHMM, nowHHMM, isBefore, isAfter, normalize };
