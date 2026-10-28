import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { HeroComponent } from '../../shared/hero/hero.component';
import { PeopleService } from '../../core/services/people.service';
import { SPECIALITY_LABELS, Speciality } from '../../core/models';
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
  /** URL de la foto (opcional). Si no hay, el template muestra el avatar por defecto. */
  image?: string | null;
}

/** Profesionales por diapositiva del carrusel de "Nuestro equipo". */
const TEAM_PAGE_SIZE = 4;

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
   * Equipo mostrado en la portada, en un carrusel de a 4 profesionales por
   * diapositiva. GET /api/public/people/professionals es público (no exige
   * sesión), así que cualquier visitante ve los profesionales activos reales;
   * si la petición falla igual se conserva este contenido de respaldo.
   */
  protected readonly team = signal<TeamMember[]>([
    { name: 'Dr. Andrés Ceballos', speciality: 'Terapia neural', note: '15 años de experiencia' },
    { name: 'Dra. Mariana Ruiz', speciality: 'Quiropraxia', note: 'Especialista en columna' },
    { name: 'Dr. Felipe Ortega', speciality: 'Fisioterapia', note: 'Rehabilitación deportiva' },
    { name: 'Dra. Camila Torres', speciality: 'Fisioterapia', note: 'Terapia manual' },
  ]);

  /** Divide el equipo en grupos de 4 para cada diapositiva del carrusel. */
  protected readonly teamSlides = computed(() => {
    const members = this.team();
    const slides: TeamMember[][] = [];
    for (let i = 0; i < members.length; i += TEAM_PAGE_SIZE) {
      slides.push(members.slice(i, i + TEAM_PAGE_SIZE));
    }
    return slides;
  });

  constructor() {
    this.people.listPublicActiveProfessionals().subscribe({
      next: (res) => {
        const activos = asList(res);
        if (!activos.length) return;
        this.team.set(
          activos.map((p) => ({
            name: `${p.nameProf} ${p.lastNameProf}`.trim(),
            speciality: SPECIALITY_LABELS[p.specialityProf],
            note: p.typeProf === 'Doctor' ? 'Médico tratante' : 'Terapeuta',
            image: p.imageProf,
          })),
        );
      },
      error: () => {
        /* falla la petición: se mantiene el equipo de respaldo */
      },
    });
  }
}
