import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CancelDialogComponent } from './cancel-dialog.component';

describe('CancelDialogComponent', () => {
  let fixture: ComponentFixture<CancelDialogComponent>;
  let component: CancelDialogComponent;
  let el: HTMLElement;

  function setup(requireReason: boolean) {
    TestBed.configureTestingModule({ imports: [CancelDialogComponent] });
    fixture = TestBed.createComponent(CancelDialogComponent);
    component = fixture.componentInstance;
    component.summary = 'martes, 3 de noviembre a las 8:00 a. m.';
    component.requireReason = requireReason;
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  function type(text: string) {
    const area = el.querySelector('textarea') as HTMLTextAreaElement;
    area.value = text;
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit() {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('no confirma si el motivo obligatorio tiene menos de 10 caracteres', () => {
    setup(true);
    const spy = vi.fn();
    component.confirmed.subscribe(spy);

    type('corto');
    submit();

    expect(spy).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Escribe al menos 10 caracteres');
  });

  it('confirma con el motivo sin espacios sobrantes', () => {
    setup(true);
    const spy = vi.fn();
    component.confirmed.subscribe(spy);

    type('  Tengo una cirugía ese día  ');
    submit();

    expect(spy).toHaveBeenCalledWith('Tengo una cirugía ese día');
  });

  it('permite confirmar sin motivo cuando es opcional', () => {
    setup(false);
    const spy = vi.fn();
    component.confirmed.subscribe(spy);

    submit();

    expect(spy).toHaveBeenCalledWith('');
    expect(el.textContent).toContain('(opcional)');
  });

  it('se cierra con Escape', () => {
    setup(true);
    const spy = vi.fn();
    component.closed.subscribe(spy);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(spy).toHaveBeenCalled();
  });
});
