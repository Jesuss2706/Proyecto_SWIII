const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { STATUSES } = require('./appointment.enums');

const Appointment = sequelize.define(
  'Appointment',
  {
    codApp: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    codProf: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    codPatient: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dateApp: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeApp: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    descApp: DataTypes.STRING,
    statusApp: {
      type: DataTypes.ENUM(...STATUSES),
      allowNull: false,
      defaultValue: 'Scheduled',
    },
  },
  {
    tableName: 'appointments',
    schema: 'appointment',
    timestamps: true,
  }
);

module.exports = Appointment;
