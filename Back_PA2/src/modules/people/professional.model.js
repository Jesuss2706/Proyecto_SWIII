const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const UserRef = require('./userRef.model');
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

Professional.belongsTo(UserRef, { foreignKey: 'codUser', targetKey: 'codUser', as: 'userRef' });

module.exports = Professional;
