const dateUtils = require('../date-utils');

describe('date-utils.dayOfWeekName', () => {
  it('identifica correctamente un lunes', () => {
    // 2026-03-16 es lunes
    expect(dateUtils.dayOfWeekName('2026-03-16')).toBe('MONDAY');
  });

  it('identifica correctamente un sábado', () => {
    // 2026-03-14 es sábado
    expect(dateUtils.dayOfWeekName('2026-03-14')).toBe('SATURDAY');
  });

  it('identifica correctamente un domingo', () => {
    // 2026-03-15 es domingo
    expect(dateUtils.dayOfWeekName('2026-03-15')).toBe('SUNDAY');
  });

  it('no sufre corrimiento de día por zona horaria en fin/comienzo de mes', () => {
    expect(dateUtils.dayOfWeekName('2026-01-01')).toBe('THURSDAY');
  });
});

describe('date-utils.isWeekend', () => {
  it('retorna true para sábado y domingo', () => {
    expect(dateUtils.isWeekend('2026-03-14')).toBe(true);
    expect(dateUtils.isWeekend('2026-03-15')).toBe(true);
  });

  it('retorna false para un día entre semana', () => {
    expect(dateUtils.isWeekend('2026-03-16')).toBe(false);
  });
});

describe('date-utils.addDays', () => {
  it('suma días dentro del mismo mes', () => {
    expect(dateUtils.addDays('2026-03-16', 3)).toBe('2026-03-19');
  });

  it('suma días cruzando el fin de mes', () => {
    expect(dateUtils.addDays('2026-01-30', 3)).toBe('2026-02-02');
  });

  it('suma días cruzando el fin de año', () => {
    expect(dateUtils.addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('admite valores negativos para restar días', () => {
    expect(dateUtils.addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('date-utils.isBeforeDate', () => {
  it('compara fechas en formato YYYY-MM-DD correctamente', () => {
    expect(dateUtils.isBeforeDate('2026-03-01', '2026-03-02')).toBe(true);
    expect(dateUtils.isBeforeDate('2026-03-02', '2026-03-01')).toBe(false);
    expect(dateUtils.isBeforeDate('2026-03-01', '2026-03-01')).toBe(false);
  });

  it('compara correctamente a través de distintos años', () => {
    expect(dateUtils.isBeforeDate('2025-12-31', '2026-01-01')).toBe(true);
  });
});

describe('date-utils.todayStr', () => {
  it('retorna la fecha actual en formato YYYY-MM-DD', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 16, 10, 30)); // 16 marzo 2026, hora local
    expect(dateUtils.todayStr()).toBe('2026-03-16');
    jest.useRealTimers();
  });

  it('rellena con ceros mes y día de un solo dígito', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 5, 8, 0)); // 5 enero 2026
    expect(dateUtils.todayStr()).toBe('2026-01-05');
    jest.useRealTimers();
  });
});
