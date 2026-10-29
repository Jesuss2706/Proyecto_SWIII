import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAgendadoresComponent } from './admin-agendadores.component';

describe('AdminAgendadoresComponent', () => {
  let component: AdminAgendadoresComponent;
  let fixture: ComponentFixture<AdminAgendadoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAgendadoresComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAgendadoresComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
