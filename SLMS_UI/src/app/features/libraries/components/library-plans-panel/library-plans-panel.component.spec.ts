import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryPlansPanelComponent } from './library-plans-panel.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { PlanService } from '@core/services/plan.service';

describe('LibraryPlansPanelComponent', () => {
  let fixture: ComponentFixture<LibraryPlansPanelComponent>;
  let component: LibraryPlansPanelComponent;
  const planServiceStub = createServiceStub(['activate', 'create', 'deactivate', 'list', 'update']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LibraryPlansPanelComponent,
      [
        { provide: PlanService, useValue: planServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LibraryPlansPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('institutionId', '00000000-0000-0000-0000-000000000001');
    fixture.componentRef.setInput('branchId', '00000000-0000-0000-0000-000000000001');
    fixture.componentRef.setInput('libraryId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call PlanService.list when loadPlans()', () => {
    planServiceStub.list.mockClear();
    invokeComponentMethod(component, 'loadPlans');
    expect(planServiceStub.list).toHaveBeenCalled();
  });
});
