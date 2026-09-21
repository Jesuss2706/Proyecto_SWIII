const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

// Roles y estados replicados de RoleUserEnum / StatusUserEnum del auth-service original
const ROLES = ['Professional', 'Admin', 'Patient', 'Scheduler'];
const STATUSER = ['Active', 'Inactive'];

const User = sequelize.define(
  'User',
  {
    codUser: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cedUser: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },
    passUser: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nameUser: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secondNameUser: DataTypes.STRING,
    lastNameUser: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    secondLastNameUser: DataTypes.STRING,
    statusUser: {
      type: DataTypes.ENUM(...STATUSER),
      allowNull: false,
      defaultValue: 'Active',
    },
    roleUser: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
    },
    securityQuestion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    securityAnswer: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'users',
    schema: 'auth',
    timestamps: true,
  }
);

User.ROLES = ROLES;
User.STATUSER = STATUSER;

module.exports = User;
