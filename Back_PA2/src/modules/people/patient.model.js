const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Patient = sequelize.define(
  'Patient',
  {
    codPatient: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    idPatient: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },
    namePatient: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secondNamePatient: DataTypes.STRING,
    lastNamePatient: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secondLastNamePatient: DataTypes.STRING,
    phonePatient: DataTypes.BIGINT,
    dateBirthPatient: DataTypes.DATEONLY,
    genderPatient: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'patients',
    schema: 'people',
    timestamps: true,
  }
);

module.exports = Patient;
