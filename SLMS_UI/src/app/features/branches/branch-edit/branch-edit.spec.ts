import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BranchEdit } from './branch-edit';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { BranchService } from '../branch.service';

describe('BranchEdit', () => {
  let fixture: ComponentFixture<BranchEdit>;
  let component: BranchEdit;
  const branchServiceStub = createServiceStub(['getDetailView', 'updateBranch']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BranchEdit,
      [
        { provide: BranchService, useValue: branchServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BranchEdit);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
