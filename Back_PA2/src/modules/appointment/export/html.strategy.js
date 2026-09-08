const { nullSafe, timestamp } = require('./export.utils');

function resolveHtmlColor(status) {
  switch (status) {
    case 'Cancelled':
      return '#ffe5e5';
    case 'Rescheduled':
      return '#fff9e5';
    case 'Completed':
      return '#e5ffe8';
    default:
      return '';
  }
}

function exportAppointments(appointments) {
  const rows = appointments
    .map((app) => {
      const bgColor = resolveHtmlColor(app.statusApp);
      const rowStyle = bgColor ? ` style="background-color: ${bgColor};"` : '';
      return `    <tr${rowStyle}>
      <td>${app.codApp}</td><td>${nullSafe(app.patientName)}</td><td>${nullSafe(app.professionalName)}</td>
      <td>${nullSafe(app.specialityProf)}</td><td>${nullSafe(app.typeProf)}</td><td>${app.dateApp}</td>
      <td>${app.timeApp}</td><td>${nullSafe(app.statusApp)}</td><td>${nullSafe(app.descApp)}</td>
    </tr>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Citas Exportadas</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #5947FF; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #5947FF; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Reporte de Citas Médicas</h1>
  <p style="color: #666; font-size: 0.9em;">Exportado el: <strong>${timestamp()}</strong></p>
  <table>
    <tr>
      <th>ID</th><th>Paciente</th><th>Profesional</th><th>Especialidad</th><th>Tipo</th>
      <th>Fecha</th><th>Hora</th><th>Estado</th><th>Descripción</th>
    </tr>
${rows}
  </table>
  <div style="margin-top: 16px; font-size: 0.85em; color: #444;">
    <strong>Leyenda de estados:</strong>&nbsp;
    <span style="background:#e5ffe8; padding:2px 8px; border-radius:4px;">Completada</span>&nbsp;
    <span style="background:#fff9e5; padding:2px 8px; border-radius:4px;">Reagendada</span>&nbsp;
    <span style="background:#ffe5e5; padding:2px 8px; border-radius:4px;">Cancelada</span>
  </div>
</body>
</html>`;

  return Buffer.from(html, 'utf-8');
}

module.exports = {
  export: exportAppointments,
  contentType: 'text/html',
  extension: '.html',
};
