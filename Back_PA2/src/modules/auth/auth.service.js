const User = require('./auth.model');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../shared/errors');

// Las consultas de solo lectura NUNCA deben incluir el hash de la contraseña
// ni las preguntas/respuestas de seguridad (columnas heredadas).
const PUBLIC_ATTRS = { exclude: ['passUser', 'securityQuestion', 'securityAnswer'] };

// Keycloak es la fuente de verdad de la identidad (login, contraseña, roles).
// auth.users pasa a ser un "espejo" local: se crea/actualiza la primera vez que
// el usuario llama a /api/auth/me, para que people.professional y las demás
// tablas puedan seguir usando codUser como llave foránea.
async function syncFromToken(claims) {
  if (!/^\d{6,12}$/.test(String(claims.sub))) {
    throw new BadRequestError('El username de Keycloak debe ser la cédula (6 a 12 dígitos)');
  }

  const [user, created] = await User.findOrCreate({
    where: { cedUser: claims.sub },
    defaults: {
      nameUser: claims.firstName || claims.sub,
      lastNameUser: claims.lastName || '-',
      roleUser: claims.role,
    },
  });

  if (!created) {
    // El rol y el nombre en Keycloak mandan: se reflejan en la copia local.
    if (claims.firstName) user.nameUser = claims.firstName;
    if (claims.lastName) user.lastNameUser = claims.lastName;
    user.roleUser = claims.role;
    if (user.changed()) await user.save();
  }

  if (user.statusUser === 'Inactive') {
    throw new UnauthorizedError('Usuario inactivo');
  }

  return {
    codUser: user.codUser,
    cedUser: Number(user.cedUser),
    nameUser: user.nameUser,
    secondNameUser: user.secondNameUser,
    lastNameUser: user.lastNameUser,
    secondLastNameUser: user.secondLastNameUser,
    statusUser: user.statusUser,
    roleUser: user.roleUser,
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
  if (dto.statusUser != null) user.statusUser = dto.statusUser;

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
  syncFromToken,
  findByRole,
  findByCedula,
  findByCodigoUser,
  update,
  deactivate,
};