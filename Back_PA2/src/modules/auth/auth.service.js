const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const env = require('../../config/env');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../shared/errors');

// Estas rutas de auth son públicas (sin authMiddleware), así que las consultas
// de solo lectura NUNCA deben incluir el hash de la contraseña ni las
// preguntas/respuestas de seguridad.
const PUBLIC_ATTRS = { exclude: ['passUser', 'securityQuestion', 'securityAnswer'] };

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

  return user;
}

// Detecta si una contraseña ya está encriptada con bcrypt (empieza con $2a$, $2b$ o $2y$)
function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function login({ cedUser, password }) {
  const user = await User.findOne({ where: { cedUser } });
  if (!user) {
    throw new UnauthorizedError('Usuario no encontrado');
  }

  let valid;

  if (isBcryptHash(user.passUser)) {
    // Contraseña ya encriptada: comparación normal
    valid = await bcrypt.compare(password, user.passUser);
  } else {
    // Contraseña sin encriptar (p. ej. insertada directo por SQL): comparación en texto plano
    valid = password === user.passUser;

    if (valid) {
      // Si coincide, se encripta y se guarda para dejarla migrada a bcrypt
      user.passUser = await bcrypt.hash(password, 10);
      await user.save();
    }
  }

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
    user: {
      codUser: user.codUser,
      cedUser: Number(user.cedUser),
      nameUser: user.nameUser,
      secondNameUser: user.secondNameUser,
      lastNameUser: user.lastNameUser,
      secondLastNameUser: user.secondLastNameUser,
      statusUser: user.statusUser,
      roleUser: user.roleUser,
    },
  };
}

async function findByRole(role) {
  return User.findAll({ where: { roleUser: role }, attributes: PUBLIC_ATTRS });
}

async function findByCedula(cedUser) {
  return User.findOne({ where: { cedUser }, attributes: PUBLIC_ATTRS });
}

async function findByCodigoUser(codUser) {
  return User.findByPk(codUser, { attributes: PUBLIC_ATTRS });
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
  return user;
}

async function deactivate(id) {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('Usuario no encontrado');

  user.statusUser = 'Inactive';
  await user.save();
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