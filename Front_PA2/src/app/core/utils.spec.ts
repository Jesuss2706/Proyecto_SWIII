import { asList, formatTime, formatDate, byTimeAsc, specialityLabel } from './utils';
import { Appointment } from './models';

describe('utils.asList', () => {
  it('retorna el mismo arreglo si no es null', () => {
    const arr = [1, 2, 3];
    expect(asList(arr)).toBe(arr);
  });

  it('retorna un arreglo vacío si el valor es null (respuesta 204)', () => {
    expect(asList(null)).toEqual([]);
  });
});

describe('utils.formatTime', () => {
  it('formatea una hora de la mañana', () => {
    expect(formatTime('09:05')).toBe('9:05 a. m.');
  });

  it('formatea el mediodía como 12 p. m.', () => {
    expect(formatTime('12:00')).toBe('12:00 p. m.');
  });

  it('formatea la medianoche como 12 a. m.', () => {
    expect(formatTime('00:00')).toBe('12:00 a. m.');
  });

  it('formatea una hora de la tarde', () => {
    expect(formatTime('14:30')).toBe('2:30 p. m.');
  });

  it('acepta el formato con segundos que devuelve el backend', () => {
    expect(formatTime('14:30:00')).toBe('2:30 p. m.');
  });
});

describe('utils.formatDate', () => {
  it('no sufre corrimiento de zona horaria al formatear', () => {
    const result = formatDate('2026-03-16');
    expect(result).toContain('marzo');
    expect(result).toContain('16');
  });
});

describe('utils.byTimeAsc', () => {
  it('ordena citas por hora ascendente', () => {
    const a = { timeApp: '10:00:00' } as Appointment;
    const b = { timeApp: '08:00:00' } as Appointment;
    expect(byTimeAsc(a, b)).toBeGreaterThan(0);
    expect(byTimeAsc(b, a)).toBeLessThan(0);
  });

  it('retorna 0 para horas iguales', () => {
    const a = { timeApp: '09:00:00' } as Appointment;
    const b = { timeApp: '09:00:00' } as Appointment;
    expect(byTimeAsc(a, b)).toBe(0);
  });

  it('permite usarse directamente con Array.prototype.sort', () => {
    const list = [{ timeApp: '15:00:00' }, { timeApp: '08:00:00' }, { timeApp: '10:30:00' }] as Appointment[];
    const sorted = [...list].sort(byTimeAsc).map((a) => a.timeApp);
    expect(sorted).toEqual(['08:00:00', '10:30:00', '15:00:00']);
  });
});

describe('utils.specialityLabel', () => {
  it('retorna la etiqueta en español de una especialidad conocida', () => {
    expect(specialityLabel('Chiropractor')).toBe('Quiropraxia');
    expect(specialityLabel('General')).toBe('Medicina general');
  });

  it('retorna el mismo valor si la especialidad no tiene etiqueta mapeada', () => {
    expect(specialityLabel('Inexistente' as any)).toBe('Inexistente');
  });
});
