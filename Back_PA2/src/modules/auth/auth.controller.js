const authService = require('./auth.service');
const { required } = require('../../shared/validate');
const { BadRequestError } = require('../../shared/errors');

async function register(req, res, next) {
  try {
    const errors = required(req.body, ['cedUser', 'passUser', 'nameUser', 'lastNameUser', 'email']);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const user = await authService.register(req.body);
    res.status(201).json({ codUser: user.codUser });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    res.json(await authService.syncFromToken(req.user));
  } catch (err) {
    next(err);
  }
}

async function findByRole(req, res, next) {
  try {
    const errors = required(req.query, ['role']);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const users = await authService.findByRole(req.query.role);
    if (users.length === 0) return res.status(204).send();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function findByCedula(req, res, next) {
  try {
    const user = await authService.findByCedula(req.params.cedula);
    if (!user) {
      return res.status(404).json({ error: `No se encontró el usuario con cédula: ${req.params.cedula}` });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function findByCodigo(req, res, next) {
  try {
    const user = await authService.findByCodigoUser(req.params.codigo);
    if (!user) {
      return res.status(404).json({ error: `No se encontró el usuario con codigo: ${req.params.codigo}` });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await authService.update(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    await authService.deactivate(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, me, findByRole, findByCedula, findByCodigo, update, deactivate };