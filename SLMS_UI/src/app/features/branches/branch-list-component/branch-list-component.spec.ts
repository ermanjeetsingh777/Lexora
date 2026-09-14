import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BranchListComponent } from './branch-list-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { BranchService } from '../branch.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { AuthService } from '@core/services/auth.service';

describe('BranchListComponent', () => {
  let fixture: ComponentFixture<BranchListComponent>;
  let component: BranchListComponent;
  const branchServiceStub = createServiceStub(['getListView']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateBranch', 'load']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BranchListComponent,
      [
        { provide: BranchService, useValue: branchServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BranchListComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call OrganizationEntitlementService.load when load()', () => {
    organizationEntitlementServiceStub.load.mockClear();
    invokeComponentMethod(component, 'load');
    expect(organizationEntitlementServiceStub.load).toHaveBeenCalled();
  });
});
