const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Patient = sequelize.define(
  'Patient',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    fullName: DataTypes.STRING,
    email: DataTypes.STRING,
  },
  {
    tableName: 'patients',
    schema: 'people',
    timestamps: true,
  }
);

module.exports = Patient;
