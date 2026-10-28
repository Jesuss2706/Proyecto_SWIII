import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PeopleService } from './people.service';
import { environment } from '../../../environments/environment';
import { Patient, Professional } from '../models';

describe('PeopleService', () => {
  let service: PeopleService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/people`;
  const publicBase = `${environment.apiUrl}/public/people`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PeopleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('findPatientByCedula hace GET a /people/patients/:idPatient', () => {
    const patient = { codPatient: 1, idPatient: 123 } as Patient;

    service.findPatientByCedula(123).subscribe((res) => expect(res).toEqual(patient));

    const req = httpMock.expectOne(`${base}/patients/123`);
    expect(req.request.method).toBe('GET');
    req.flush(patient);
  });

  it('createPatient hace POST con el payload del paciente', () => {
    const payload = { idPatient: 123, namePatient: 'Ana' } as any;

    service.createPatient(payload).subscribe();

    const req = httpMock.expectOne(`${base}/patients`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ codPatient: 1, ...payload });
  });

  it('listProfessionals hace GET a /people/professionals', () => {
    service.listProfessionals().subscribe();

    const req = httpMock.expectOne(`${base}/professionals`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('listBySpeciality hace GET a /people/professionals/speciality/:speciality', () => {
    service.listBySpeciality('Chiropractor').subscribe();

    const req = httpMock.expectOne(`${base}/professionals/speciality/Chiropractor`);
    req.flush([]);
  });

  it('updateSchedule hace PUT con la nueva franja horaria del profesional', () => {
    const payload = {
      arrivalTime: '08:00',
      departureTime: '16:00',
      attentionInterval: 30,
      unavailableDays: 'SATURDAY',
    };

    service.updateSchedule(5, payload).subscribe();

    const req = httpMock.expectOne(`${base}/professionals/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({} as Professional);
  });

  it('listPublicActiveProfessionals hace GET a la ruta pública sin autenticación', () => {
    service.listPublicActiveProfessionals().subscribe();

    const req = httpMock.expectOne(`${publicBase}/professionals`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
