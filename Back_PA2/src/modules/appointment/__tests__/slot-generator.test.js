const { generateSlotsForProfessional, buildBusyKeys } = require('../slot-generator');

const baseProf = {
  codProf: 1,
  nameProf: 'Ana',
  lastNameProf: 'Pérez',
  typeProf: 'Doctor',
  specialityProf: 'General',
  arrivalTime: '08:00',
  departureTime: '10:00',
  attentionInterval: 30,
  unavailableDays: null,
};

describe('slot-generator.generateSlotsForProfessional', () => {
  const FUTURE_DATE = '2026-03-16'; // lunes, se asume distinto de "hoy" en los tests

  beforeEach(() => {
    // Fijamos "ahora" en una fecha distinta a FUTURE_DATE para que la generación
    // de slots no dependa de la hora actual (comportamiento de día futuro).
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 9, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('genera slots cada `attentionInterval` minutos dentro del horario', () => {
    const slots = generateSlotsForProfessional(baseProf, FUTURE_DATE, new Set(), false);
    expect(slots.map((s) => s.timeApp)).toEqual(['08:00', '08:30', '09:00', '09:30']);
  });

  it('no genera un slot que sobrepasaría la hora de salida', () => {
    const slots = generateSlotsForProfessional(baseProf, FUTURE_DATE, new Set(), false);
    expect(slots.every((s) => s.timeApp !== '10:00')).toBe(true);
  });

  it('excluye los horarios que ya están ocupados (busyKeys)', () => {
    const busy = new Set(['1-08:30', '1-09:30']);
    const slots = generateSlotsForProfessional(baseProf, FUTURE_DATE, busy, false);
    expect(slots.map((s) => s.timeApp)).toEqual(['08:00', '09:00']);
  });

  it('retorna un arreglo vacío si el día es un día no disponible del profesional', () => {
    const prof = { ...baseProf, unavailableDays: 'MONDAY,FRIDAY' };
    const slots = generateSlotsForProfessional(prof, FUTURE_DATE, new Set(), false); // 2026-03-16 es lunes
    expect(slots).toEqual([]);
  });

  it('usa 30 minutos por defecto si attentionInterval no es válido', () => {
    const prof = { ...baseProf, attentionInterval: 0 };
    const slots = generateSlotsForProfessional(prof, FUTURE_DATE, new Set(), false);
    expect(slots).toHaveLength(4);
  });

  it('usa 07:00-18:00 por defecto si no hay arrivalTime/departureTime', () => {
    const prof = { ...baseProf, arrivalTime: null, departureTime: null, attentionInterval: 60 };
    const slots = generateSlotsForProfessional(prof, FUTURE_DATE, new Set(), false);
    expect(slots[0].timeApp).toBe('07:00');
    expect(slots[slots.length - 1].timeApp).toBe('17:00');
  });

  it('incluye datos del profesional en cada slot generado', () => {
    const slots = generateSlotsForProfessional(baseProf, FUTURE_DATE, new Set(), false);
    expect(slots[0]).toMatchObject({
      dateApp: FUTURE_DATE,
      codProf: 1,
      professionalName: 'Ana Pérez',
      typeProf: 'Doctor',
      specialityProf: 'General',
    });
  });

  describe('cuando la fecha consultada es hoy', () => {
    beforeEach(() => {
      // "Ahora" son las 08:45 del mismo día que se consulta
      jest.useFakeTimers().setSystemTime(new Date(2026, 2, 16, 8, 45));
    });

    it('con strictAfterNow=false incluye la hora actual pero excluye horas pasadas', () => {
      const slots = generateSlotsForProfessional(baseProf, '2026-03-16', new Set(), false);
      // 08:00 (pasado) se excluye; 09:00 y 09:30 (>= 08:45) se incluyen
      expect(slots.map((s) => s.timeApp)).toEqual(['09:00', '09:30']);
    });

    it('con strictAfterNow=true excluye también la hora exactamente igual a la actual', () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 2, 16, 9, 0));
      const slots = generateSlotsForProfessional(baseProf, '2026-03-16', new Set(), true);
      expect(slots.map((s) => s.timeApp)).toEqual(['09:30']);
    });
  });
});

describe('slot-generator.buildBusyKeys', () => {
  it('construye un Set con la forma codProf-HH:mm normalizando segundos', () => {
    const occupied = [
      { codProf: 1, timeApp: '08:30:00' },
      { codProf: 2, timeApp: '09:00:00' },
    ];
    const keys = buildBusyKeys(occupied);
    expect(keys.has('1-08:30')).toBe(true);
    expect(keys.has('2-09:00')).toBe(true);
    expect(keys.size).toBe(2);
  });

  it('retorna un Set vacío si no hay citas ocupadas', () => {
    expect(buildBusyKeys([]).size).toBe(0);
  });
});
