import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BranchDetailComponent } from './branch-detail.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { BranchService } from '../branch.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { AuthService } from '@core/services/auth.service';

describe('BranchDetailComponent', () => {
  let fixture: ComponentFixture<BranchDetailComponent>;
  let component: BranchDetailComponent;
  const branchServiceStub = createServiceStub(['getDetailView']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateLibrary']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BranchDetailComponent,
      [
        { provide: BranchService, useValue: branchServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BranchDetailComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
