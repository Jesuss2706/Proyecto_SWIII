const { DataTypes } = require('sequelize');
const sequelize = require('./db');

// sequelize.sync() crea las tablas que faltan pero no agrega columnas nuevas a
// tablas que ya existen. Aquí se agregan, una sola vez, las columnas que se han
// sumado a modelos existentes, para que nadie tenga que recrear su base local.
const PENDING_COLUMNS = [
  {
    table: { tableName: 'appointments', schema: 'appointment' },
    columns: {
      cancelReason: { type: DataTypes.STRING(500), allowNull: true },
      cancelledAt: { type: DataTypes.DATE, allowNull: true },
    },
  },
];

async function applySchemaUpdates() {
  const qi = sequelize.getQueryInterface();
  for (const { table, columns } of PENDING_COLUMNS) {
    const existing = await qi.describeTable(table);
    for (const [name, definition] of Object.entries(columns)) {
      if (!existing[name]) {
        await qi.addColumn(table, name, definition);
        console.log(`Columna agregada: ${table.schema}.${table.tableName}.${name}`);
      }
    }
  }
}

module.exports = { applySchemaUpdates };
