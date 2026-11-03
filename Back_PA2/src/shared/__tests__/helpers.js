// Utilidades compartidas por las pruebas unitarias de controladores.
// (No termina en .test.js, así que Jest no lo ejecuta como prueba.)

/** Respuesta de Express falsa: cada método devuelve `res` para poder encadenar. */
function mockRes() {
  const res = {};
  for (const method of ['status', 'json', 'send', 'location', 'type', 'set']) {
    res[method] = jest.fn().mockReturnValue(res);
  }
  return res;
}

/** Petición de Express falsa con valores por defecto. */
function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: undefined, ...overrides };
}

module.exports = { mockRes, mockReq };