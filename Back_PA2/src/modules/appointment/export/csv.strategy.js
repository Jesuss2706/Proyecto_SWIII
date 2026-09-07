const { nullSafe, timestamp, resolveAlert } = require('./export.utils');

function escapeCsv(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportAppointments(appointments) {
  const lines = [];
  lines.push(`# Exportado el: ${timestamp()}`);
  lines.push('ID,Paciente,Profesional,Especialidad,Tipo,Fecha,Hora,Estado,Descripción,Alerta');

  for (const app of appointments) {
    lines.push(
      [
        app.codApp,
        escapeCsv(nullSafe(app.patientName)),
        escapeCsv(nullSafe(app.professionalName)),
        escapeCsv(nullSafe(app.specialityProf)),
        escapeCsv(nullSafe(app.typeProf)),
        app.dateApp,
        app.timeApp,
        escapeCsv(nullSafe(app.statusApp)),
        escapeCsv(nullSafe(app.descApp)),
        escapeCsv(resolveAlert(app.statusApp)),
      ].join(',')
    );
  }

  return Buffer.from(lines.join('\n') + '\n', 'utf-8');
}

module.exports = {
  export: exportAppointments,
  contentType: 'text/csv',
  extension: '.csv',
};
