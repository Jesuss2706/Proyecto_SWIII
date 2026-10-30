import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';

interface DayCell {
  dateStr: string;
  day: number;
  disabled: boolean;
  isToday: boolean;
  isWeekend: boolean;
  /** Días del mes anterior/siguiente que rellenan la primera y última semana. */
  outside: boolean;
}

interface PickCell {
  value: number;
  label: string;
  disabled: boolean;
  isCurrent: boolean;
}

export type CalendarView = 'days' | 'months' | 'years';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const YEARS_PER_PAGE = 12;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayStr(): string {
  const now = new Date();
  return toStr(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Suma días a un YYYY-MM-DD sin depender de la zona horaria local. */
function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12));
  return toStr(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** true si dateStr (YYYY-MM-DD) cae sábado o domingo, sin depender de zona horaria local. */
function isWeekendStr(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day === 0 || day === 6;
}

/** '2026-03-14' -> 'sábado, 14 de marzo de 2026' */
export function longDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

/**
 * Calendario mensual para elegir una fecha (reemplaza al <input type="date"> nativo).
 * Al tocar el nombre del mes se pasa a elegir mes y año, útil para fechas lejanas
 * como la de nacimiento. Uso:
 *   <app-calendar-picker [selected]="date()" [min]="minDate" [max]="maxDate"
 *                         [blockWeekends]="true" (dateChange)="onPick($event)" />
 */
@Component({
  selector: 'app-calendar-picker',
  standalone: true,
  imports: [],
  templateUrl: './calendar-picker.component.html',
  styleUrl: './calendar-picker.component.css',
})
export class CalendarPickerComponent implements OnInit, OnChanges {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Los inputs se guardan en señales para que los computed (días, etiquetas) se recalculen
  // cuando el padre los cambia, p. ej. blockWeekends llega tarde desde la configuración.
  private readonly selectedSig = signal<string | null>(null);
  private readonly minSig = signal<string | undefined>(undefined);
  private readonly maxSig = signal<string | undefined>(undefined);
  private readonly blockWeekendsSig = signal(false);

  /** Fecha seleccionada, formato YYYY-MM-DD. */
  @Input() set selected(v: string | null) { this.selectedSig.set(v || null); }
  get selected(): string | null { return this.selectedSig(); }
  /** Fecha mínima seleccionable (inclusive), YYYY-MM-DD. */
  @Input() set min(v: string | undefined) { this.minSig.set(v || undefined); }
  get min(): string | undefined { return this.minSig(); }
  /** Fecha máxima seleccionable (inclusive), YYYY-MM-DD. */
  @Input() set max(v: string | undefined) { this.maxSig.set(v || undefined); }
  get max(): string | undefined { return this.maxSig(); }
  /** Si es true, sábados y domingos aparecen deshabilitados. */
  @Input() set blockWeekends(v: boolean) { this.blockWeekendsSig.set(!!v); }
  get blockWeekends(): boolean { return this.blockWeekendsSig(); }
  /** Vista inicial cuando no hay fecha elegida (p. ej. 'years' para la fecha de nacimiento). */
  @Input() startView: CalendarView = 'days';
  /** Muestra el atajo "Hoy" en el pie del calendario. */
  @Input() showToday = true;

  @Output() dateChange = new EventEmitter<string>();

  protected readonly view = signal<CalendarView>('days');
  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly viewMonth = signal(new Date().getMonth());
  /** Primer año de la página visible en la vista de años. */
  protected readonly yearPageStart = signal(new Date().getFullYear() - 6);
  /** Día que tiene el foco del teclado (roving tabindex). */
  protected readonly focusDate = signal(todayStr());
  /** Dirección del último cambio de mes, para animar la entrada desde ese lado. */
  protected readonly slideDir = signal<'next' | 'prev' | 'none'>('none');

  protected readonly weekdayLabels = DIAS;
  protected readonly monthNames = MESES;

  private synced = false;

  ngOnInit() {
    this.syncViewToSelected();
    if (!this.selected && this.startView !== 'days') this.openView(this.startView);
    this.synced = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.synced && changes['selected'] && this.selected) {
      this.syncViewToSelected();
    }
  }

  private syncViewToSelected() {
    let base = this.selected || todayStr();
    if (!this.selected && this.min && base < this.min) base = this.min;
    if (!this.selected && this.max && base > this.max) base = this.max;
    const [y, m] = base.split('-').map(Number);
    if (!y || !m) return;
    this.viewYear.set(y);
    this.viewMonth.set(m - 1);
    this.focusDate.set(base);
  }

  // ---------- Vista de días ----------

  protected readonly monthKey = computed(() => `${this.viewYear()}-${this.viewMonth()}`);
  protected readonly monthName = computed(() => MESES[this.viewMonth()]);

  protected readonly days = computed<DayCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const today = todayStr();

    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    // getUTCDay(): 0 = domingo .. 6 = sábado → lo convertimos a semana Lun..Dom
    const leading = (firstOfMonth.getUTCDay() + 6) % 7;
    const start = addDaysStr(toStr(year, month, 1), -leading);

    // Siempre 6 semanas: el alto del calendario no salta al cambiar de mes.
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const dateStr = addDaysStr(start, i);
      const [, m, d] = dateStr.split('-').map(Number);
      cells.push({
        dateStr,
        day: d,
        disabled: this.isDisabled(dateStr),
        isToday: dateStr === today,
        isWeekend: isWeekendStr(dateStr),
        outside: m - 1 !== month,
      });
    }
    return cells;
  });

  protected readonly canGoPrev = computed(() => {
    if (this.view() === 'years') {
      return !this.min || this.yearPageStart() - 1 >= Number(this.min.slice(0, 4));
    }
    if (this.view() === 'months') {
      return !this.min || this.viewYear() - 1 >= Number(this.min.slice(0, 4));
    }
    if (!this.min) return true;
    const prevMonthEnd = new Date(Date.UTC(this.viewYear(), this.viewMonth(), 0));
    return toStr(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), prevMonthEnd.getUTCDate()) >= this.min;
  });

  protected readonly canGoNext = computed(() => {
    if (this.view() === 'years') {
      return !this.max || this.yearPageStart() + YEARS_PER_PAGE <= Number(this.max.slice(0, 4));
    }
    if (this.view() === 'months') {
      return !this.max || this.viewYear() + 1 <= Number(this.max.slice(0, 4));
    }
    if (!this.max) return true;
    const next = new Date(Date.UTC(this.viewYear(), this.viewMonth() + 1, 1));
    return toStr(next.getUTCFullYear(), next.getUTCMonth(), 1) <= this.max;
  });

  protected readonly todaySelectable = computed(() => !this.isDisabled(todayStr()));

  protected readonly selectedLabel = computed(() => (this.selected ? longDate(this.selected) : null));

  // ---------- Vistas de mes y año ----------

  protected readonly monthCells = computed<PickCell[]>(() => {
    const year = this.viewYear();
    const now = new Date();
    return MESES.map((name, i) => {
      const first = toStr(year, i, 1);
      const last = toStr(year, i, new Date(Date.UTC(year, i + 1, 0)).getUTCDate());
      return {
        value: i,
        label: name.slice(0, 3),
        disabled: (!!this.max && first > this.max) || (!!this.min && last < this.min),
        isCurrent: year === now.getFullYear() && i === now.getMonth(),
      };
    });
  });

  protected readonly yearCells = computed<PickCell[]>(() => {
    const start = this.yearPageStart();
    const minY = this.min ? Number(this.min.slice(0, 4)) : -Infinity;
    const maxY = this.max ? Number(this.max.slice(0, 4)) : Infinity;
    const thisYear = new Date().getFullYear();
    return Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
      const y = start + i;
      return { value: y, label: String(y), disabled: y < minY || y > maxY, isCurrent: y === thisYear };
    });
  });

  protected readonly yearRangeLabel = computed(
    () => `${this.yearPageStart()} – ${this.yearPageStart() + YEARS_PER_PAGE - 1}`,
  );

  // ---------- Acciones ----------

  protected isDisabled(dateStr: string): boolean {
    if (this.min && dateStr < this.min) return true;
    if (this.max && dateStr > this.max) return true;
    if (this.blockWeekends && isWeekendStr(dateStr)) return true;
    return false;
  }

  protected openView(view: CalendarView) {
    if (view === 'years') {
      // El año actual va cerca del centro, sin desperdiciar la página en años fuera de rango.
      let start = this.viewYear() - 6;
      if (this.max) start = Math.min(start, Number(this.max.slice(0, 4)) - (YEARS_PER_PAGE - 1));
      if (this.min) start = Math.max(start, Number(this.min.slice(0, 4)));
      this.yearPageStart.set(start);
    }
    this.slideDir.set('none');
    this.view.set(view);
  }

  protected prev() {
    if (!this.canGoPrev()) return;
    this.slideDir.set('prev');
    if (this.view() === 'years') this.yearPageStart.update((y) => y - YEARS_PER_PAGE);
    else if (this.view() === 'months') this.viewYear.update((y) => y - 1);
    else this.shiftMonth(-1);
  }

  protected next() {
    if (!this.canGoNext()) return;
    this.slideDir.set('next');
    if (this.view() === 'years') this.yearPageStart.update((y) => y + YEARS_PER_PAGE);
    else if (this.view() === 'months') this.viewYear.update((y) => y + 1);
    else this.shiftMonth(1);
  }

  private shiftMonth(delta: number) {
    const d = new Date(Date.UTC(this.viewYear(), this.viewMonth() + delta, 1));
    this.viewYear.set(d.getUTCFullYear());
    this.viewMonth.set(d.getUTCMonth());
  }

  protected pickYear(cell: PickCell) {
    if (cell.disabled) return;
    this.viewYear.set(cell.value);
    this.view.set('months');
  }

  protected pickMonth(cell: PickCell) {
    if (cell.disabled) return;
    this.viewMonth.set(cell.value);
    this.slideDir.set('none');
    this.view.set('days');
  }

  protected select(cell: DayCell) {
    if (cell.disabled) return;
    if (cell.outside) {
      this.slideDir.set(cell.dateStr < toStr(this.viewYear(), this.viewMonth(), 1) ? 'prev' : 'next');
      const [y, m] = cell.dateStr.split('-').map(Number);
      this.viewYear.set(y);
      this.viewMonth.set(m - 1);
    }
    this.focusDate.set(cell.dateStr);
    this.dateChange.emit(cell.dateStr);
  }

  protected goToday() {
    const today = todayStr();
    if (this.isDisabled(today)) return;
    const [y, m] = today.split('-').map(Number);
    this.viewYear.set(y);
    this.viewMonth.set(m - 1);
    this.view.set('days');
    this.focusDate.set(today);
    this.dateChange.emit(today);
  }

  /** Flechas, Inicio/Fin y RePág/AvPág mueven el foco por los días, como en un grid nativo. */
  protected onGridKeydown(event: KeyboardEvent) {
    const steps: Record<string, number> = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    };
    let target: string | null = null;
    const current = this.focusDate();

    if (event.key in steps) {
      target = addDaysStr(current, steps[event.key]);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const [y, m, d] = current.split('-').map(Number);
      const delta = event.key === 'PageUp' ? -1 : 1;
      const lastDay = new Date(Date.UTC(y, m - 1 + delta + 1, 0)).getUTCDate();
      const moved = new Date(Date.UTC(y, m - 1 + delta, Math.min(d, lastDay)));
      target = toStr(moved.getUTCFullYear(), moved.getUTCMonth(), moved.getUTCDate());
    } else if (event.key === 'Home' || event.key === 'End') {
      const [y, m, d] = current.split('-').map(Number);
      const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
      target = addDaysStr(current, event.key === 'Home' ? -weekday : 6 - weekday);
    } else {
      return;
    }

    event.preventDefault();
    if ((this.min && target < this.min) || (this.max && target > this.max)) return;

    const [ty, tm] = target.split('-').map(Number);
    if (ty !== this.viewYear() || tm - 1 !== this.viewMonth()) {
      // Sin animación: es una acción de teclado que se repite mucho.
      this.slideDir.set('none');
      this.viewYear.set(ty);
      this.viewMonth.set(tm - 1);
    }
    this.focusDate.set(target);
    queueMicrotask(() => this.focusDay(target!));
  }

  private focusDay(dateStr: string) {
    this.host.nativeElement
      .querySelector<HTMLButtonElement>(`[data-date="${dateStr}"]`)
      ?.focus();
  }

  /** El único día alcanzable con Tab: el enfocado si está en el mes visible, si no el primero habilitado. */
  private readonly tabStop = computed(() => {
    const inMonth = this.days().filter((c) => !c.outside);
    const focused = inMonth.find((c) => c.dateStr === this.focusDate());
    return (focused ?? inMonth.find((c) => !c.disabled) ?? inMonth[0]).dateStr;
  });

  protected tabIndexFor(cell: DayCell): number {
    return cell.dateStr === this.tabStop() ? 0 : -1;
  }

  protected ariaLabel(cell: DayCell): string {
    return longDate(cell.dateStr) + (cell.isToday ? ' (hoy)' : '');
  }
}
