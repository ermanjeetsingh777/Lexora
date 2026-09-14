import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersListComponent } from './users-list.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';

describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let component: UsersListComponent;
  const adminServiceStub = createServiceStub(['assignUserRoles', 'changeUserPassword', 'createUser', 'deleteUser', 'getAuditLogs', 'getRoles', 'getUserScopeOptions', 'getUsers', 'updateUser']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateUser', 'load']);

  beforeEach(async () => {
    await configureComponentTestBed(
      UsersListComponent,
      [
        { provide: AdminService, useValue: adminServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
      ],
    );
    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call AdminService.getAuditLogs when load()', () => {
    adminServiceStub.getAuditLogs.mockClear();
    invokeComponentMethod(component, 'load');
    expect(adminServiceStub.getAuditLogs).toHaveBeenCalled();
  });

  it('should call AdminService.getRoles when load()', () => {
    adminServiceStub.getRoles.mockClear();
    invokeComponentMethod(component, 'load');
    expect(adminServiceStub.getRoles).toHaveBeenCalled();
  });

  it('should call AdminService.getUserScopeOptions when load()', () => {
    adminServiceStub.getUserScopeOptions.mockClear();
    invokeComponentMethod(component, 'load');
    expect(adminServiceStub.getUserScopeOptions).toHaveBeenCalled();
  });

  it('should call AdminService.getUsers when load()', () => {
    adminServiceStub.getUsers.mockClear();
    invokeComponentMethod(component, 'load');
    expect(adminServiceStub.getUsers).toHaveBeenCalled();
  });

  it('should call OrganizationEntitlementService.load when load()', () => {
    organizationEntitlementServiceStub.load.mockClear();
    invokeComponentMethod(component, 'load');
    expect(organizationEntitlementServiceStub.load).toHaveBeenCalled();
  });
});
