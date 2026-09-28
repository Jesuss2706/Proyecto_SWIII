const { required, oneOf } = require('../validate');

describe('validate.required', () => {
  it('no reporta errores cuando todos los campos requeridos están presentes', () => {
    const body = { a: '1', b: 'x' };
    expect(required(body, ['a', 'b'])).toEqual([]);
  });

  it('reporta un error por cada campo faltante (undefined)', () => {
    const body = { a: '1' };
    const errors = required(body, ['a', 'b']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('b');
  });

  it('trata null como campo faltante', () => {
    const body = { a: null };
    const errors = required(body, ['a']);
    expect(errors).toHaveLength(1);
  });

  it('trata cadena vacía como campo faltante', () => {
    const body = { a: '' };
    const errors = required(body, ['a']);
    expect(errors).toHaveLength(1);
  });

  it('acepta 0 y false como valores válidos (no vacíos)', () => {
    const body = { a: 0, b: false };
    expect(required(body, ['a', 'b'])).toEqual([]);
  });

  it('reporta varios errores en el orden de los campos', () => {
    const errors = required({}, ['a', 'b', 'c']);
    expect(errors).toHaveLength(3);
  });
});

describe('validate.oneOf', () => {
  it('retorna null cuando el valor está en la lista permitida', () => {
    expect(oneOf('Admin', ['Admin', 'Patient'], 'roleUser')).toBeNull();
  });

  it('retorna null cuando el valor es undefined o null (campo opcional)', () => {
    expect(oneOf(undefined, ['Admin'], 'roleUser')).toBeNull();
    expect(oneOf(null, ['Admin'], 'roleUser')).toBeNull();
  });

  it('retorna un mensaje de error cuando el valor no está permitido', () => {
    const msg = oneOf('Superadmin', ['Admin', 'Patient'], 'roleUser');
    expect(msg).not.toBeNull();
    expect(msg).toContain('roleUser');
    expect(msg).toContain('Admin');
    expect(msg).toContain('Patient');
  });
});
