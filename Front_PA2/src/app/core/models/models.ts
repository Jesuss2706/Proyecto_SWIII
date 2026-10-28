/* ==========================================================================
   Tipos espejo de los modelos Sequelize del backend (Back_PA2).
   Mantener sincronizado con: auth.model.js, patient.model.js,
   professional.model.js, appointment.model.js
   ========================================================================== */

export type UserRole = 'Professional' | 'Admin' | 'Patient' | 'Scheduler';
export type Status = 'Active' | 'Inactive';
export type ProfType = 'Doctor' | 'Therapist';
export type Speciality = 'Neural_Therapy' | 'Chiropractor' | 'Physiotherapy' | 'General';
export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';

/** Etiquetas en español para mostrar en la interfaz. */
export const SPECIALITY_LABELS: Record<Speciality, string> = {
  Neural_Therapy: 'Terapia neural',
  Chiropractor: 'Quiropraxia',
  Physiotherapy: 'Fisioterapia',
  General: 'Medicina general',
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  Scheduled: 'Agendada',
  Completed: 'Atendida',
  Cancelled: 'Cancelada',
  Rescheduled: 'Reagendada',
};

export const WEEKDAYS = [
  { key: 'MONDAY', label: 'Lunes' },
  { key: 'TUESDAY', label: 'Martes' },
  { key: 'WEDNESDAY', label: 'Miércoles' },
  { key: 'THURSDAY', label: 'Jueves' },
  { key: 'FRIDAY', label: 'Viernes' },
  { key: 'SATURDAY', label: 'Sábado' },
  { key: 'SUNDAY', label: 'Domingo' },
];

export interface User {
  codUser: number;
  cedUser: number;
  nameUser: string;
  secondNameUser?: string | null;
  lastNameUser: string;
  secondLastNameUser?: string | null;
  statusUser: Status;
  roleUser: UserRole;
}

export interface LoginRequest {
  cedUser: number;
  password: string;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface RegisterRequest {
  cedUser: number;
  passUser: string;
  nameUser: string;
  secondNameUser?: string;
  lastNameUser: string;
  secondLastNameUser?: string;
  roleUser: UserRole;
  securityQuestion: string;
  securityAnswer: string;
}

export interface Patient {
  codPatient: number;
  idPatient: number;
  namePatient: string;
  secondNamePatient?: string | null;
  lastNamePatient: string;
  secondLastNamePatient?: string | null;
  phonePatient?: number | null;
  dateBirthPatient?: string | null;
  genderPatient: string;
}

export type PatientRequest = Omit<Patient, 'codPatient'>;

export interface Professional {
  codProf: number;
  codUser: number;
  genProf: string;
  phoneProf?: string | null;
  statusProf: Status;
  typeProf: ProfType;
  specialityProf: Speciality;
  /** 'HH:mm:ss' */
  arrivalTime: string;
  departureTime: string;
  /** minutos entre cita y cita */
  attentionInterval: number;
  /** 'MONDAY,WEDNESDAY' — días en los que NO atiende */
  unavailableDays?: string | null;
  /** URL de la foto del profesional (opcional). */
  imageProf?: string | null;
  /** Datos del usuario (auth) asociado, incluidos directamente por el backend. */
  user?: User;
}

/** Arma "Nombre Segundo Nombre Apellido Segundo Apellido" a partir del User asociado a un profesional. */
export function professionalFullName(p: Professional): string {
  const u = p.user;
  if (!u) return '';
  const name = [u.nameUser, u.secondNameUser].filter(Boolean).join(' ');
  const lastName = [u.lastNameUser, u.secondLastNameUser].filter(Boolean).join(' ');
  return `${name} ${lastName}`.trim();
}

/** Campos de agenda que acepta PUT /people/professionals/:id */
export interface ProfessionalScheduleRequest {
  arrivalTime: string;
  departureTime: string;
  attentionInterval: number;
  unavailableDays: string;
}

/**
 * Profesional "público" — lo que devuelve GET /public/people/professionals
 * (sin autenticación). Ya viene mapeado por el backend: sin datos de auth,
 * sin codUser/statusProf/genProf. Se usa en el Home, sección "Nuestro equipo".
 */
export interface PublicProfessional {
  codProf: number;
  nameProf: string;
  lastNameProf: string;
  specialityProf: Speciality;
  typeProf: ProfType;
  arrivalTime: string;
  departureTime: string;
  attentionInterval: number;
  unavailableDays?: string | null;
  imageProf?: string | null;
}

export interface Appointment {
  codApp: number;
  codProf: number;
  codPatient: number;
  /** 'YYYY-MM-DD' */
  dateApp: string;
  /** 'HH:mm:ss' */
  timeApp: string;
  descApp?: string | null;
  statusApp: AppointmentStatus;
}

export interface AppointmentRequest {
  codProf: number;
  codPatient: number;
  dateApp: string;
  timeApp: string;
  descApp?: string;
}

/** Franja libre devuelta por GET /appointments/generated */
export interface Slot {
  dateApp: string;
  timeApp: string;
  codProf: number;
  professionalName: string;
  typeProf: ProfType;
  specialityProf: Speciality;
}

/**
 * Parámetros globales de agendamiento (requisito 3).
 * El backend todavía no expone un endpoint para esto; se persiste en
 * localStorage hasta que exista /api/settings.
 */
export interface SchedulingSettings {
  /** Cuántas semanas hacia adelante se pueden reservar citas. */
  bookingWindowWeeks: number;
  /** Bloquear fines de semana en el selector de fecha. */
  blockWeekends: boolean;
}
