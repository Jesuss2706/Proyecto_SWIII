const { esFestivo } = require('../festivos');

describe('festivos.esFestivo', () => {
  it('reconoce un festivo conocido de 2026', () => {
    expect(esFestivo('2026-01-01') === true || esFestivo('2026-05-01')).toBe(true);
    expect(esFestivo('2026-05-01')).toBe(true); // Día del Trabajo
    expect(esFestivo('2026-12-25')).toBe(true); // Navidad
  });

  it('retorna false para un día que no es festivo', () => {
    expect(esFestivo('2026-03-16')).toBe(false);
  });

  it('retorna false para una fecha fuera de la lista (otro año)', () => {
    expect(esFestivo('2027-05-01')).toBe(false);
  });
});
