const timeUtils = require('../time-utils');

describe('time-utils.normalize', () => {
  it('recorta segundos de un valor HH:mm:ss', () => {
    expect(timeUtils.normalize('09:00:00')).toBe('09:00');
  });

  it('deja igual un valor ya en HH:mm', () => {
    expect(timeUtils.normalize('14:30')).toBe('14:30');
  });
});

describe('time-utils.toMinutes', () => {
  it('convierte HH:mm a minutos desde medianoche', () => {
    expect(timeUtils.toMinutes('00:00')).toBe(0);
    expect(timeUtils.toMinutes('01:00')).toBe(60);
    expect(timeUtils.toMinutes('09:30')).toBe(570);
  });

  it('acepta formato con segundos', () => {
    expect(timeUtils.toMinutes('09:30:00')).toBe(570);
  });
});

describe('time-utils.toHHMM', () => {
  it('convierte minutos a formato HH:mm con ceros a la izquierda', () => {
    expect(timeUtils.toHHMM(0)).toBe('00:00');
    expect(timeUtils.toHHMM(570)).toBe('09:30');
    expect(timeUtils.toHHMM(60)).toBe('01:00');
  });

  it('hace wrap-around después de las 24 horas', () => {
    expect(timeUtils.toHHMM(24 * 60)).toBe('00:00');
    expect(timeUtils.toHHMM(25 * 60 + 15)).toBe('01:15');
  });
});

describe('time-utils.isBefore / isAfter', () => {
  it('isBefore es true cuando a < b', () => {
    expect(timeUtils.isBefore('08:00', '09:00')).toBe(true);
    expect(timeUtils.isBefore('09:00', '08:00')).toBe(false);
    expect(timeUtils.isBefore('09:00', '09:00')).toBe(false);
  });

  it('isAfter es true cuando a > b', () => {
    expect(timeUtils.isAfter('09:00', '08:00')).toBe(true);
    expect(timeUtils.isAfter('08:00', '09:00')).toBe(false);
    expect(timeUtils.isAfter('09:00', '09:00')).toBe(false);
  });
});

describe('time-utils.nowHHMM', () => {
  it('retorna la hora actual en formato HH:mm', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 16, 7, 5));
    expect(timeUtils.nowHHMM()).toBe('07:05');
    jest.useRealTimers();
  });
});
