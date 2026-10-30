import { Component, ElementRef, HostListener, Input, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CalendarPickerComponent, CalendarView } from '../calendar-picker/calendar-picker.component';

/**
 * Campo de fecha con calendario desplegable. Funciona con formularios reactivos
 * (formControlName) y con ngModel; el valor es un string YYYY-MM-DD.
 *   <app-date-field formControlName="dateBirthPatient" max="2026-10-29" startView="years" />
 */
@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [CalendarPickerComponent],
  templateUrl: './date-field.component.html',
  styleUrl: './date-field.component.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true },
  ],
})
export class DateFieldComponent implements ControlValueAccessor {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() min?: string;
  @Input() max?: string;
  @Input() blockWeekends = false;
  @Input() startView: CalendarView = 'days';
  @Input() placeholder = 'Elige una fecha';
  /** id del botón, para enlazarlo con un <label for="...">. */
  @Input() inputId?: string;

  protected readonly value = signal<string | null>(null);
  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  protected readonly alignRight = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  /** '2026-03-14' -> '14 de marzo de 2026' (sin día de la semana, para que quepa en el campo). */
  protected label(v: string): string {
    const [y, m, d] = v.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(y, m - 1, d));
  }

  writeValue(v: string | null): void {
    this.value.set(v || null);
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected toggle() {
    if (this.disabled()) return;
    if (this.open()) {
      this.close();
      return;
    }
    // Si el calendario (~21rem) no cabe a la derecha del campo, se ancla a su borde derecho.
    const rect = this.host.nativeElement.getBoundingClientRect();
    const popWidth = Math.min(21 * 16, window.innerWidth - 32);
    this.alignRight.set(rect.left + popWidth > window.innerWidth - 16);
    this.open.set(true);
  }

  protected pick(dateStr: string) {
    this.value.set(dateStr);
    this.onChange(dateStr);
    this.close();
    this.host.nativeElement.querySelector<HTMLButtonElement>('.pa-datefield-trigger')?.focus();
  }

  private close() {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
  }

  @HostListener('document:pointerdown', ['$event'])
  protected onDocPointer(event: PointerEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('keydown.escape')
  protected onEscape() {
    if (!this.open()) return;
    this.close();
    this.host.nativeElement.querySelector<HTMLButtonElement>('.pa-datefield-trigger')?.focus();
  }
}
