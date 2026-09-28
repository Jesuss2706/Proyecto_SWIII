const {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} = require('../errors');

describe('Clases de error', () => {
  it('AppError usa 500 por defecto y guarda el mensaje', () => {
    const err = new AppError('algo falló');
    expect(err.message).toBe('algo falló');
    expect(err.statusCode).toBe(500);
    expect(err).toBeInstanceOf(Error);
  });

  it('AppError permite un statusCode personalizado', () => {
    const err = new AppError('custom', 418);
    expect(err.statusCode).toBe(418);
  });

  it('NotFoundError usa 404 y mensaje por defecto', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Recurso no encontrado');
    expect(err).toBeInstanceOf(AppError);
  });

  it('BadRequestError usa 400', () => {
    const err = new BadRequestError('cédula inválida');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('cédula inválida');
  });

  it('UnauthorizedError usa 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError usa 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });
});
