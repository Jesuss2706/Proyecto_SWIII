const authService = require('./auth.service');
const User = require('./auth.model');
const { required, oneOf } = require('../../shared/validate');
const { BadRequestError } = require('../../shared/errors');

async function login(req, res, next) {
  try {
    const errors = required(req.body, ['cedUser', 'password']);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const errors = [
      ...required(req.body, ['cedUser', 'passUser', 'nameUser', 'lastNameUser', 'roleUser', 'securityQuestion', 'securityAnswer']),
    ];
    const roleError = oneOf(req.body.roleUser, User.ROLES, 'roleUser');
    if (roleError) errors.push(roleError);
    if (errors.length) throw new BadRequestError(errors.join(', '));

    const user = await authService.register(req.body);
    res.status(201).location(`/api/auth/users/${user.codUser}`).json(user);
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

module.exports = { login, register, findByRole, findByCedula, findByCodigo, update, deactivate };
