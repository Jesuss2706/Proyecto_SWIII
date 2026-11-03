const { nullSafe, timestamp, resolveAlert } = require('../export/export.utils');

describe('export.utils.nullSafe', () => {
  it.each([
    [null, ''],
    [undefined, ''],
    ['Ana', 'Ana'],
    [0, '0'],
    [42, '42'],
  ])('nullSafe(%p) => %p', (input, expected) => {
    expect(nullSafe(input)).toBe(expected);
  });
});

describe('export.utils.timestamp', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('formatea la fecha como dd/mm/aaaa hh:mm:ss con ceros a la izquierda', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 3, 9, 5, 7)); // 3 nov 2026, hora local

    expect(timestamp()).toBe('03/11/2026 09:05:07');
  });
});

describe('export.utils.resolveAlert', () => {
  it.each([
    ['Cancelled', 'Cita cancelada'],
    ['Rescheduled', 'Cita reagendada'],
    ['Completed', 'Cita completada'],
    ['Scheduled', ''],
    [undefined, ''],
  ])('estado %p => alerta %p', (status, expected) => {
    expect(resolveAlert(status)).toBe(expected);
  });
});