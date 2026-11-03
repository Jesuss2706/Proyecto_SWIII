const errorMiddleware = require('../middlewares/error.middleware');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../errors');
const { mockRes, mockReq } = require('./helpers');

describe('error.middleware', () => {
  let consoleSpy;
  const next = jest.fn();

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('responde con el statusCode del error y su mensaje en formato { error }', () => {
    const res = mockRes();

    errorMiddleware(new NotFoundError('Cita no encontrada'), mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cita no encontrada' });
  });

  it.each([
    [new BadRequestError('mal'), 400],
    [new ForbiddenError('prohibido'), 403],
  ])('respeta el código de los errores esperados (%s)', (err, code) => {
    const res = mockRes();

    errorMiddleware(err, mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(code);
  });

  it('no escribe en consola los errores esperados (4xx)', () => {
    errorMiddleware(new BadRequestError('mal'), mockReq(), mockRes(), next);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('usa 500 y registra el error cuando no trae statusCode', () => {
    const res = mockRes();
    const err = new Error('boom');

    errorMiddleware(err, mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    expect(consoleSpy).toHaveBeenCalledWith(err);
  });

  it('usa un mensaje genérico si el error no trae mensaje', () => {
    const res = mockRes();

    errorMiddleware(new Error(''), mockReq(), res, next);

    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
  });
});