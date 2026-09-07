const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const env = require('../../config/env');
const eventBus = require('../../shared/eventBus');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../shared/errors');

function toUserEvent(user) {
  return {
    codUser: user.codUser,
    cedUser: Number(user.cedUser),
    nameUser: user.nameUser,
    secondNameUser: user.secondNameUser,
    lastNameUser: user.lastNameUser,
    secondLastNameUser: user.secondLastNameUser,
    roleUser: user.roleUser,
  };
}

async function register(dto) {
  const exists = await User.findOne({ where: { cedUser: dto.cedUser } });
  if (exists) {
    throw new BadRequestError('Ya existe un usuario con esa cédula');
  }

  const user = await User.create({
    cedUser: dto.cedUser,
    passUser: await bcrypt.hash(dto.passUser, 10),
    nameUser: dto.nameUser,
    secondNameUser: dto.secondNameUser,
    lastNameUser: dto.lastNameUser,
    secondLastNameUser: dto.secondLastNameUser,
    roleUser: dto.roleUser,
    securityQuestion: dto.securityQuestion,
    securityAnswer: dto.securityAnswer,
  });

  // people (y quien más necesite saber de usuarios nuevos) escucha este evento
  eventBus.emit('user.registered', toUserEvent(user));

  return user;
}

async function login({ cedUser, password }) {
  const user = await User.findOne({ where: { cedUser } });
  if (!user) {
    throw new UnauthorizedError('Usuario no encontrado');
  }

  const valid = await bcrypt.compare(password, user.passUser);
  if (!valid) {
    throw new UnauthorizedError('Contraseña incorrecta');
  }

  if (user.statusUser === 'Inactive') {
    throw new UnauthorizedError('Usuario inactivo');
  }

  const token = jwt.sign(
    { sub: String(user.cedUser), role: user.roleUser, codUser: user.codUser },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  return {
    token,
    role: user.roleUser,
    codUser: user.codUser,
    cedUser: Number(user.cedUser),
    nameUser: user.nameUser,
  };
}

async function findByRole(role) {
  return User.findAll({ where: { roleUser: role } });
}

async function findByCedula(cedUser) {
  return User.findOne({ where: { cedUser } });
}

async function findByCodigoUser(codUser) {
  return User.findByPk(codUser);
}

async function update(id, dto) {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('Usuario no encontrado');

  if (dto.nameUser != null) user.nameUser = dto.nameUser;
  if (dto.secondNameUser != null) user.secondNameUser = dto.secondNameUser;
  if (dto.lastNameUser != null) user.lastNameUser = dto.lastNameUser;
  if (dto.secondLastNameUser != null) user.secondLastNameUser = dto.secondLastNameUser;
  if (dto.securityQuestion != null) user.securityQuestion = dto.securityQuestion;
  if (dto.securityAnswer != null) user.securityAnswer = dto.securityAnswer;
  if (dto.statusUser != null) user.statusUser = dto.statusUser;
  if (dto.passUser != null) user.passUser = await bcrypt.hash(dto.passUser, 10);

  await user.save();
  eventBus.emit('user.updated', toUserEvent(user));
  return user;
}

async function deactivate(id) {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('Usuario no encontrado');

  user.statusUser = 'Inactive';
  await user.save();
  eventBus.emit('user.updated', toUserEvent(user));
}

module.exports = {
  register,
  login,
  findByRole,
  findByCedula,
  findByCodigoUser,
  update,
  deactivate,
};
