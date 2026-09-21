import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Patient,
  PatientRequest,
  Professional,
  ProfessionalScheduleRequest,
  Speciality,
} from '../models';

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/people`;

  // ----- Pacientes -----
  /** GET /people/patients/:idPatient — busca por número de cédula. */
  findPatientByCedula(idPatient: number | string) {
    return this.http.get<Patient>(`${this.base}/patients/${idPatient}`);
  }

  findPatientByCod(codPatient: number) {
    return this.http.get<Patient>(`${this.base}/patients/codPatient/${codPatient}`);
  }

  listPatients() {
    return this.http.get<Patient[]>(`${this.base}/patients`);
  }

  createPatient(payload: PatientRequest) {
    return this.http.post<Patient>(`${this.base}/patients`, payload);
  }

  // ----- Profesionales -----
  listProfessionals() {
    return this.http.get<Professional[]>(`${this.base}/professionals`);
  }

  listBySpeciality(speciality: Speciality) {
    return this.http.get<Professional[]>(`${this.base}/professionals/speciality/${speciality}`);
  }

  findProfessional(codProf: number) {
    return this.http.get<Professional>(`${this.base}/professionals/${codProf}`);
  }

  /** Requisito 3: actualiza franja horaria, intervalo y días no disponibles. */
  updateSchedule(codProf: number, payload: ProfessionalScheduleRequest) {
    return this.http.put<Professional>(`${this.base}/professionals/${codProf}`, payload);
  }
}
