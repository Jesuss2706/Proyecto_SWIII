const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Réplica de solo lectura de los datos de auth que people necesita.
// Se mantiene sincronizada mediante los eventos "user.registered" / "user.updated"
// (ver people.listeners.js), nunca se escribe desde aquí como fuente de verdad.
const UserRef = sequelize.define(
  'UserRef',
  {
    codUser: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
    },
    cedUser: DataTypes.BIGINT,
    nameUser: DataTypes.STRING,
    lastNameUser: DataTypes.STRING,
    roleUser: DataTypes.STRING,
  },
  {
    tableName: 'user_ref',
    schema: 'people',
    timestamps: false,
  }
);

module.exports = UserRef;
