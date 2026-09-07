const timeUtils = require('./time-utils');
const dateUtils = require('./date-utils');

function isUnavailableDay(unavailableDays, dayName) {
  if (!unavailableDays || !unavailableDays.trim()) return false;
  return unavailableDays
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .includes(dayName);
}

function buildBusyKey(codProf, time) {
  return `${codProf}-${time}`;
}

/**
 * Genera los slots libres de un profesional para una fecha dada.
 * strictAfterNow=true excluye el slot que coincide exactamente con la hora actual
 * (usado por el endpoint que filtra por especialidad); false lo incluye
 * (comportamiento del resto de endpoints del servicio original).
 */
function generateSlotsForProfessional(prof, date, busyKeys, strictAfterNow) {
  const slots = [];
  const dayName = dateUtils.dayOfWeekName(date);
  if (isUnavailableDay(prof.unavailableDays, dayName)) return slots;

  const start = prof.arrivalTime || '07:00';
  const end = prof.departureTime || '18:00';
  const interval = prof.attentionInterval && prof.attentionInterval > 0 ? prof.attentionInterval : 30;
  const isToday = date === dateUtils.todayStr();
  const now = timeUtils.nowHHMM();

  let current = timeUtils.toMinutes(start);
  const endMinutes = timeUtils.toMinutes(end);

  while (current + interval <= endMinutes) {
    const currentTime = timeUtils.toHHMM(current);

    if (isToday) {
      const tooLate = strictAfterNow ? !timeUtils.isAfter(currentTime, now) : timeUtils.isBefore(currentTime, now);
      if (tooLate) {
        current += interval;
        continue;
      }
    }

    const key = buildBusyKey(prof.codProf, currentTime);
    if (!busyKeys.has(key)) {
      slots.push({
        dateApp: date,
        timeApp: currentTime,
        codProf: prof.codProf,
        professionalName: `${prof.nameProf} ${prof.lastNameProf}`.trim(),
        typeProf: prof.typeProf,
        specialityProf: prof.specialityProf,
      });
    }
    current += interval;
  }

  return slots;
}

function buildBusyKeys(occupiedAppointments) {
  return new Set(occupiedAppointments.map((a) => buildBusyKey(a.codProf, timeUtils.normalize(a.timeApp))));
}

module.exports = { generateSlotsForProfessional, buildBusyKeys };
