const { buildFullName } = require('../people.utils');

describe('people.utils.buildFullName', () => {
  it('concatena primer y segundo nombre cuando ambos existen', () => {
    expect(buildFullName('Juan', 'Carlos')).toBe('Juan Carlos');
  });

  it('retorna solo el primer nombre si el segundo es undefined', () => {
    expect(buildFullName('Juan', undefined)).toBe('Juan');
  });

  it('retorna solo el primer nombre si el segundo es null', () => {
    expect(buildFullName('Juan', null)).toBe('Juan');
  });

  it('retorna solo el primer nombre si el segundo es una cadena en blanco', () => {
    expect(buildFullName('Juan', '   ')).toBe('Juan');
  });

  it('retorna cadena vacía si el primer nombre falta y no hay segundo', () => {
    expect(buildFullName(undefined, undefined)).toBe('');
  });

  it('recorta espacios sobrantes del resultado', () => {
    expect(buildFullName('Juan', 'Carlos')).not.toMatch(/\s{2,}/);
  });
});
