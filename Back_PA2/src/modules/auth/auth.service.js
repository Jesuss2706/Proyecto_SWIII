const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const env = require('../../config/env');
const eventBus = require('../../shared/eventBus');
const { BadRequestError, UnauthorizedError } = require('../../shared/errors');

async function register({ email, password, role }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new BadRequestError('Ya existe un usuario con ese correo');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, role });

  // Otros módulos (people) escuchan este evento para crear el perfil
  // de paciente o profesional correspondiente.
  eventBus.emit('user.created', {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { id: user.id, email: user.email, role: user.role };
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

module.exports = { register, login };
