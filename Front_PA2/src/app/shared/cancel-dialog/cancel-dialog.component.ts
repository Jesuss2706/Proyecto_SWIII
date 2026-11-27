import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  signal,
} from '@angular/core';

export const MIN_REASON_LENGTH = 10;
export const MAX_REASON_LENGTH = 500;

/**
 * Diálogo para confirmar la cancelación de una cita y pedir la justificación.
 * Se cierra con Escape o "No, volver", mueve el foco al campo de motivo al abrirse
 * y lo devuelve al elemento que lo abrió al cerrarse.
 *   <app-cancel-dialog [summary]="..." [requireReason]="true" [busy]="busy()"
 *                      [error]="error()" (confirmed)="cancel($event)" (closed)="close()" />
 */
@Component({
  selector: 'app-cancel-dialog',
  standalone: true,
  templateUrl: './cancel-dialog.component.html',
  styleUrl: './cancel-dialog.component.css',
})
export class CancelDialogComponent implements AfterViewInit, OnDestroy {
  /** Texto que identifica la cita, por ejemplo "martes, 3 de noviembre a las 8:00 a. m.". */
  @Input({ required: true }) summary = '';
  /** El paciente debe justificar la cancelación; para el personal el motivo es opcional. */
  @Input() requireReason = true;
  @Input() busy = false;
  @Input() error: string | null = null;

  @Output() confirmed = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('reasonField') private reasonField?: ElementRef<HTMLTextAreaElement>;

  protected readonly minLength = MIN_REASON_LENGTH;
  protected readonly maxLength = MAX_REASON_LENGTH;
  protected readonly reason = signal('');
  protected readonly touched = signal(false);

  protected readonly length = computed(() => this.reason().trim().length);
  protected readonly valid = computed(() =>
    this.requireReason ? this.length() >= MIN_REASON_LENGTH : true,
  );

  private previousFocus: HTMLElement | null = null;

  ngAfterViewInit() {
    this.previousFocus = document.activeElement as HTMLElement | null;
    queueMicrotask(() => this.reasonField?.nativeElement.focus());
  }

  ngOnDestroy() {
    this.previousFocus?.focus?.();
  }

  @HostListener('document:keydown.escape')
  protected onEscape() {
    if (!this.busy) this.closed.emit();
  }

  protected submit() {
    this.touched.set(true);
    if (!this.valid() || this.busy) return;
    this.confirmed.emit(this.reason().trim());
  }
}
