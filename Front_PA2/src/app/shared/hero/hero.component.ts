import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Encabezado del sitio. Dos modos:
 *  - variant="home"    → portada completa, con figura y cifras (PDF, frame Portada).
 *  - variant="compact" → cabecera corta para páginas internas (agenda, configuración).
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent {
  readonly variant = input<'home' | 'compact'>('home');
  readonly eyebrow = input<string>('Terapia neural · Quiropraxia · Fisioterapia');
  readonly subtitle = input<string>('');
}
