const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { User } = require('../auth');
const { SPECIALITIES, STATUSES, TYPES } = require('./people.enums');

const Professional = sequelize.define(
  'Professional',
  {
    codProf: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    codUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    genProf: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneProf: DataTypes.STRING,
    statusProf: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'Active',
    },
    typeProf: {
      type: DataTypes.ENUM(...TYPES),
      allowNull: false,
    },
    specialityProf: {
      type: DataTypes.ENUM(...SPECIALITIES),
      allowNull: false,
    },
    arrivalTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    departureTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    attentionInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Ej: "MONDAY,WEDNESDAY" — igual que el original, se parsea en el servicio
    unavailableDays: DataTypes.STRING,
  },
  {
    tableName: 'professionals',
    schema: 'people',
    timestamps: true,
  }
);

// Asociación directa: un profesional pertenece a un usuario de auth.
// Al vivir en la misma BD, Sequelize puede resolver el JOIN entre schemas sin problema.
Professional.belongsTo(User, { foreignKey: 'codUser', targetKey: 'codUser', as: 'user' });

module.exports = Professional;
