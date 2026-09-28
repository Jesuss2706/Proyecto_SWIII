import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppointmentService } from './appointment.service';
import { environment } from '../../../environments/environment';
import { Appointment } from '../models';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/appointments`;

  const appointment: Appointment = {
    codApp: 1,
    codProf: 2,
    codPatient: 3,
    dateApp: '2026-03-16',
    timeApp: '09:00:00',
    statusApp: 'Scheduled',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('findByProfessionalAndDate hace GET a la ruta correcta', () => {
    service.findByProfessionalAndDate(2, '2026-03-16').subscribe((res) => {
      expect(res).toEqual([appointment]);
    });

    const req = httpMock.expectOne(`${base}/professional/2/date/2026-03-16`);
    expect(req.request.method).toBe('GET');
    req.flush([appointment]);
  });

  it('create hace POST con el payload de la cita', () => {
    const payload = { codProf: 2, codPatient: 3, dateApp: '2026-03-16', timeApp: '09:00' };

    service.create(payload).subscribe((res) => expect(res).toEqual(appointment));

    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(appointment);
  });

  it('reschedule hace PUT con la nueva fecha y hora', () => {
    service.reschedule(1, '2026-03-20', '10:00').subscribe();

    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ dateApp: '2026-03-20', timeApp: '10:00' });
    req.flush({ ...appointment, dateApp: '2026-03-20', timeApp: '10:00' });
  });

  it('updateStatus envía el alias de estado esperado por el backend', () => {
    service.updateStatus(1, 'CANCELADA').subscribe();

    const req = httpMock.expectOne(`${base}/1/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ statusApp: 'CANCELADA' });
    req.flush({ ...appointment, statusApp: 'Cancelled' });
  });

  it('cancel hace DELETE a la ruta de la cita', () => {
    service.cancel(1).subscribe();

    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('availableSlots solo incluye los parámetros provistos', () => {
    service.availableSlots({ date: '2026-03-16' }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/generated` && r.params.get('date') === '2026-03-16' && !r.params.has('codProf')
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('availableSlots incluye codProf y speciality cuando se proveen', () => {
    service.availableSlots({ date: '2026-03-16', codProf: 5, speciality: 'General' }).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/generated` &&
        r.params.get('codProf') === '5' &&
        r.params.get('speciality') === 'General'
    );
    req.flush([]);
  });

  it('exportByIds hace POST con formato como query param y responseType blob', () => {
    service.exportByIds([1, 2], 'csv').subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/export` && r.params.get('format') === 'csv');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([1, 2]);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });
});
