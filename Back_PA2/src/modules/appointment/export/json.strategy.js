const { nullSafe, timestamp, resolveAlert } = require('./export.utils');

function jsonEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function exportAppointments(appointments) {
  const lines = [];
  lines.push('{');
  lines.push(`  "exportadoEn": "${timestamp()}",`);
  lines.push(`  "totalCitas": ${appointments.length},`);
  lines.push('  "citas": [');

  appointments.forEach((app, i) => {
    lines.push('  {');
    lines.push(`    "id": ${app.codApp},`);
    lines.push(`    "paciente": "${jsonEscape(nullSafe(app.patientName))}",`);
    lines.push(`    "profesional": "${jsonEscape(nullSafe(app.professionalName))}",`);
    lines.push(`    "especialidad": "${jsonEscape(nullSafe(app.specialityProf))}",`);
    lines.push(`    "tipo": "${jsonEscape(nullSafe(app.typeProf))}",`);
    lines.push(`    "fecha": "${app.dateApp}",`);
    lines.push(`    "hora": "${app.timeApp}",`);
    lines.push(`    "estado": "${jsonEscape(nullSafe(app.statusApp))}",`);
    let line = `    "descripcion": "${jsonEscape(nullSafe(app.descApp))}"`;
    const alerta = resolveAlert(app.statusApp);
    if (alerta) {
      line += `,\n    "alerta": "${alerta}"`;
    }
    lines.push(line);
    lines.push(i < appointments.length - 1 ? '  },' : '  }');
  });

  lines.push('  ]');
  lines.push('}');

  return Buffer.from(lines.join('\n'), 'utf-8');
}

module.exports = {
  export: exportAppointments,
  contentType: 'application/json',
  extension: '.json',
};
