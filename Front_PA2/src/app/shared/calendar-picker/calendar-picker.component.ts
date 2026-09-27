import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';

interface DayCell {
  dateStr: string;
  day: number;
  disabled: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** true si dateStr (YYYY-MM-DD) cae sábado o domingo, sin depender de zona horaria local. */
function isWeekendStr(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Calendario mensual visual para elegir una fecha (reemplaza al <input type="date">
 * nativo). Uso:
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
  /** Fecha seleccionada, formato YYYY-MM-DD. */
  @Input() selected: string | null = null;
  /** Fecha mínima seleccionable (inclusive), YYYY-MM-DD. */
  @Input() min?: string;
  /** Fecha máxima seleccionable (inclusive), YYYY-MM-DD. */
  @Input() max?: string;
  /** Si es true, sábados y domingos aparecen deshabilitados. */
  @Input() blockWeekends = false;

  @Output() dateChange = new EventEmitter<string>();

  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly viewMonth = signal(new Date().getMonth());
  protected readonly weekdayLabels = DIAS;

  private synced = false;

  ngOnInit() {
    this.syncViewToSelected();
    this.synced = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.synced && changes['selected'] && this.selected) {
      this.syncViewToSelected();
    }
  }

  private syncViewToSelected() {
    const base = this.selected || this.min || todayStr();
    const [y, m] = base.split('-').map(Number);
    if (!y || !m) return;
    this.viewYear.set(y);
    this.viewMonth.set(m - 1);
  }

  protected readonly monthLabel = computed(() => `${MESES[this.viewMonth()]} ${this.viewYear()}`);

  protected readonly weeks = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();

    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    // getUTCDay(): 0 = domingo .. 6 = sábado → lo convertimos a semana Lun..Dom
    const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const cells: (DayCell | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      cells.push({
        dateStr,
        day: d,
        disabled: this.isDisabled(dateStr),
        isToday: dateStr === todayStr(),
        isWeekend: isWeekendStr(dateStr),
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (DayCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  });

  protected readonly canGoPrev = computed(() => {
    if (!this.min) return true;
    const prevMonthEnd = new Date(Date.UTC(this.viewYear(), this.viewMonth(), 0));
    const prevStr = `${prevMonthEnd.getUTCFullYear()}-${pad(prevMonthEnd.getUTCMonth() + 1)}-${pad(prevMonthEnd.getUTCDate())}`;
    return prevStr >= this.min;
  });

  protected readonly canGoNext = computed(() => {
    if (!this.max) return true;
    const nextMonthStart = new Date(Date.UTC(this.viewYear(), this.viewMonth() + 1, 1));
    const nextStr = `${nextMonthStart.getUTCFullYear()}-${pad(nextMonthStart.getUTCMonth() + 1)}-01`;
    return nextStr <= this.max;
  });

  protected isDisabled(dateStr: string): boolean {
    if (this.min && dateStr < this.min) return true;
    if (this.max && dateStr > this.max) return true;
    if (this.blockWeekends && isWeekendStr(dateStr)) return true;
    return false;
  }

  protected prevMonth() {
    if (!this.canGoPrev()) return;
    const d = new Date(Date.UTC(this.viewYear(), this.viewMonth() - 1, 1));
    this.viewYear.set(d.getUTCFullYear());
    this.viewMonth.set(d.getUTCMonth());
  }

  protected nextMonth() {
    if (!this.canGoNext()) return;
    const d = new Date(Date.UTC(this.viewYear(), this.viewMonth() + 1, 1));
    this.viewYear.set(d.getUTCFullYear());
    this.viewMonth.set(d.getUTCMonth());
  }

  protected select(cell: DayCell | null) {
    if (!cell || cell.disabled) return;
    this.dateChange.emit(cell.dateStr);
  }
}
