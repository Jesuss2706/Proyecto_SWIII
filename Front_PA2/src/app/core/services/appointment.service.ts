import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Appointment, AppointmentRequest, AppointmentStatus, Slot, Speciality } from '../models';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/appointments`;

  findByProfessionalAndDate(codProf: number, date: string) {
    return this.http.get<Appointment[]>(`${this.base}/professional/${codProf}/date/${date}`);
  }

  findByProfessional(codProf: number) {
    return this.http.get<Appointment[]>(`${this.base}/professional/${codProf}`);
  }

  findByDate(date: string) {
    return this.http.get<Appointment[]>(`${this.base}/date/${date}`);
  }

  findByPatient(codPatient: number) {
    return this.http.get<Appointment[]>(`${this.base}/patient/${codPatient}`);
  }

  findByStatus(status: AppointmentStatus) {
    return this.http.get<Appointment[]>(`${this.base}/status/${status}`);
  }

  /** Requisito 2: franjas libres para una fecha, filtrables por profesional o especialidad. */
  availableSlots(opts: { date?: string; codProf?: number; speciality?: Speciality }) {
    const params: Record<string, string> = {};
    if (opts.date) params['date'] = opts.date;
    if (opts.codProf != null) params['codProf'] = String(opts.codProf);
    if (opts.speciality) params['speciality'] = opts.speciality;
    return this.http.get<Slot[]>(`${this.base}/generated`, { params });
  }

  firstAvailable(speciality: Speciality) {
    return this.http.get<Slot>(`${this.base}/first-available/${speciality}`);
  }

  create(payload: AppointmentRequest) {
    return this.http.post<Appointment>(this.base, payload);
  }

  reschedule(codApp: number, dateApp: string, timeApp: string) {
    return this.http.put<Appointment>(`${this.base}/${codApp}`, { dateApp, timeApp });
  }

  /** Acepta los alias ATENDIDA | CANCELADA | AGENDADA del backend. */
  updateStatus(codApp: number, statusApp: 'ATENDIDA' | 'CANCELADA' | 'AGENDADA') {
    return this.http.put<Appointment>(`${this.base}/${codApp}/status`, { statusApp });
  }

  cancel(codApp: number) {
    return this.http.delete<void>(`${this.base}/${codApp}`);
  }

  /** POST /appointments/export?format=csv|json|html con el array de ids en el body. */
  exportByIds(ids: number[], format: 'csv' | 'json' | 'html') {
    return this.http.post(`${this.base}/export`, ids, {
      params: { format },
      responseType: 'blob',
    });
  }
}
