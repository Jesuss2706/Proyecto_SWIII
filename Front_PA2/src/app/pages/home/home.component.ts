import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { HeroComponent } from '../../shared/hero/hero.component';
import { PeopleService } from '../../core/services/people.service';
import { SPECIALITY_LABELS, Speciality, professionalFullName } from '../../core/models';
import { asList } from '../../core/utils';

interface ServiceCard {
  icon: string;
  title: string;
  body: string;
  speciality: Speciality;
}

interface TeamMember {
  name: string;
  speciality: string;
  note: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, LowerCasePipe, HeroComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private people = inject(PeopleService);

  protected readonly generalService: ServiceCard = {
    icon: 'bi-clipboard2-pulse',
    title: 'Cita general',
    body: 'Valoración médica inicial para revisar tu caso y orientarte hacia el tratamiento que mejor se ajuste a ti.',
    speciality: 'General',
  };

  protected readonly services: ServiceCard[] = [
    {
      icon: 'bi-activity',
      title: 'Terapia neural',
      body: 'Regulación del sistema nervioso autónomo para tratar dolor crónico, cicatrices y bloqueos energéticos.',
      speciality: 'Neural_Therapy',
    },
    {
      icon: 'bi-diagram-3',
      title: 'Quiropraxia',
      body: 'Ajustes vertebrales y articulares para restablecer la movilidad y aliviar la compresión nerviosa.',
      speciality: 'Chiropractor',
    },
    {
      icon: 'bi-person-walking',
      title: 'Fisioterapia',
      body: 'Rehabilitación funcional y ejercicio terapéutico guiado para recuperar fuerza y rango de movimiento.',
      speciality: 'Physiotherapy',
    },
  ];

  protected readonly reasons = [
    {
      title: 'Agendamiento flexible',
      body: 'Reserva tú mismo desde el sistema autónomo o pide ayuda a nuestro equipo — sin llamadas ni filas.',
    },
    {
      title: 'Historia clínica continua',
      body: 'Tu evolución queda documentada entre especialidades, no en carpetas sueltas por consultorio.',
    },
    {
      title: 'Equipo certificado',
      body: 'Profesionales activos y verificados en cada especialidad, con horarios de atención siempre actualizados.',
    },
  ];

  /**
   * Equipo mostrado en la portada. GET /api/people/professionals está detrás
   * del authMiddleware, así que un visitante sin sesión no puede consultarlo:
   * cuando la petición falla se conserva este contenido de respaldo.
   */
  protected readonly team = signal<TeamMember[]>([
    { name: 'Dr. Andrés Ceballos', speciality: 'Terapia neural', note: '15 años de experiencia' },
    { name: 'Dra. Mariana Ruiz', speciality: 'Quiropraxia', note: 'Especialista en columna' },
    { name: 'Dr. Felipe Ortega', speciality: 'Fisioterapia', note: 'Rehabilitación deportiva' },
    { name: 'Dra. Camila Torres', speciality: 'Fisioterapia', note: 'Terapia manual' },
  ]);

  constructor() {
    this.people.listProfessionals().subscribe({
      next: (res) => {
        const activos = asList(res).filter((p) => p.statusProf === 'Active');
        if (!activos.length) return;
        this.team.set(
          activos.slice(0, 4).map((p) => ({
            name: professionalFullName(p),
            speciality: SPECIALITY_LABELS[p.specialityProf],
            note: p.typeProf === 'Doctor' ? 'Médico tratante' : 'Terapeuta',
          })),
        );
      },
      error: () => {
        /* sin sesión: se mantiene el equipo de respaldo */
      },
    });
  }
}
