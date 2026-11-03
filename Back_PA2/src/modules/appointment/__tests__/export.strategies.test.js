const csv = require('../export/csv.strategy');
const json = require('../export/json.strategy');
const html = require('../export/html.strategy');
const exportService = require('../export/export.service');
const { BadRequestError } = require('../../../shared/errors');

function makeAppointment(overrides = {}) {
  return {
    codApp: 7,
    patientName: 'Ana Ruiz',
    professionalName: 'Dr. Pérez',
    specialityProf: 'Physiotherapy',
    typeProf: 'Doctor',
    dateApp: '2026-11-10',
    timeApp: '09:00:00',
    statusApp: 'Scheduled',
    descApp: 'Dolor de espalda',
    ...overrides,
  };
}

const text = (buffer) => buffer.toString('utf-8');

describe('csv.strategy', () => {
  it('devuelve un Buffer con la cabecera y una fila por cita', () => {
    const buffer = csv.export([makeAppointment(), makeAppointment({ codApp: 8 })]);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const lines = text(buffer).trim().split('\n');
    expect(lines[0]).toMatch(/^# Exportado el: /);
    expect(lines[1]).toBe('ID,Paciente,Profesional,Especialidad,Tipo,Fecha,Hora,Estado,Descripción,Alerta');
    expect(lines).toHaveLength(4);
    expect(lines[2]).toBe('7,Ana Ruiz,Dr. Pérez,Physiotherapy,Doctor,2026-11-10,09:00:00,Scheduled,Dolor de espalda,');
  });

  it('entrecomilla los campos con comas, comillas o saltos de línea', () => {
    const buffer = csv.export([makeAppointment({ descApp: 'Dolor, "fuerte"' })]);

    expect(text(buffer)).toContain('"Dolor, ""fuerte"""');
  });

  it('añade la alerta según el estado', () => {
    const buffer = csv.export([makeAppointment({ statusApp: 'Cancelled' })]);

    expect(text(buffer)).toContain('Cancelled,Dolor de espalda,Cita cancelada');
  });

  it('deja vacíos los campos nulos', () => {
    const buffer = csv.export([makeAppointment({ descApp: null, patientName: undefined })]);

    expect(text(buffer).trim().split('\n')[2]).toBe('7,,Dr. Pérez,Physiotherapy,Doctor,2026-11-10,09:00:00,Scheduled,,');
  });

  it('declara su tipo de contenido y extensión', () => {
    expect(csv.contentType).toBe('text/csv');
    expect(csv.extension).toBe('.csv');
  });
});

describe('json.strategy', () => {
  it('genera un JSON válido con el total y los datos de cada cita', () => {
    const data = JSON.parse(text(json.export([makeAppointment(), makeAppointment({ codApp: 8 })])));

    expect(data.totalCitas).toBe(2);
    expect(data.citas[0]).toMatchObject({
      id: 7,
      paciente: 'Ana Ruiz',
      profesional: 'Dr. Pérez',
      fecha: '2026-11-10',
      estado: 'Scheduled',
    });
    expect(data.citas[0]).not.toHaveProperty('alerta');
  });

  it('incluye la alerta solo cuando el estado la tiene', () => {
    const data = JSON.parse(text(json.export([makeAppointment({ statusApp: 'Completed' })])));

    expect(data.citas[0].alerta).toBe('Cita completada');
  });

  it('exporta una lista vacía como JSON válido', () => {
    const data = JSON.parse(text(json.export([])));

    expect(data).toMatchObject({ totalCitas: 0, citas: [] });
  });

  it('sigue siendo JSON válido con comillas, barras y saltos de línea en los textos', () => {
    const descApp = 'Dijo "hola"\\ y\nuna segunda línea';

    const data = JSON.parse(text(json.export([makeAppointment({ descApp })])));

    expect(data.citas[0].descripcion).toBe(descApp);
  });

  it('declara su tipo de contenido y extensión', () => {
    expect(json.contentType).toBe('application/json');
    expect(json.extension).toBe('.json');
  });
});

describe('html.strategy', () => {
  it('genera un documento HTML con una fila por cita', () => {
    const output = text(html.export([makeAppointment(), makeAppointment({ codApp: 8 })]));

    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('<td>7</td><td>Ana Ruiz</td><td>Dr. Pérez</td>');
    expect(output.match(/<td>\d+<\/td>/g)).toHaveLength(2);
  });

  it.each([
    ['Cancelled', '#ffe5e5'],
    ['Rescheduled', '#fff9e5'],
    ['Completed', '#e5ffe8'],
  ])('pinta la fila de una cita %s con su color', (statusApp, color) => {
    const output = text(html.export([makeAppointment({ statusApp })]));

    expect(output).toContain(`<tr style="background-color: ${color};">`);
  });

  it('no pinta las citas agendadas', () => {
    const output = text(html.export([makeAppointment()]));

    expect(output).not.toContain('<tr style=');
    expect(output).toContain('    <tr>\n      <td>7</td>');
  });

  it('escapa el HTML de los textos escritos por el usuario (evita XSS en el reporte)', () => {
    const output = text(
      html.export([makeAppointment({ descApp: '<script>alert(1)</script>', patientName: '<img src=x onerror=alert(1)>' })])
    );

    expect(output).not.toContain('<script>alert(1)</script>');
    expect(output).not.toContain('<img src=x');
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('declara su tipo de contenido y extensión', () => {
    expect(html.contentType).toBe('text/html');
    expect(html.extension).toBe('.html');
  });
});

describe('export.service', () => {
  it.each([
    ['csv', 'text/csv', '.csv'],
    ['json', 'application/json', '.json'],
    ['html', 'text/html', '.html'],
    ['CSV', 'text/csv', '.csv'],
  ])('resuelve la estrategia para el formato %s', (format, contentType, extension) => {
    expect(exportService.getContentType(format)).toBe(contentType);
    expect(exportService.getFileExtension(format)).toBe(extension);
    expect(Buffer.isBuffer(exportService.exportAppointments([makeAppointment()], format))).toBe(true);
  });

  it('rechaza un formato no soportado y lista los válidos', () => {
    expect(() => exportService.exportAppointments([], 'pdf')).toThrow(BadRequestError);
    expect(() => exportService.getContentType('pdf')).toThrow('json, csv, html');
  });
});