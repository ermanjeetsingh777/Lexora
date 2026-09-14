import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RolesListComponent } from './roles-list.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';

describe('RolesListComponent', () => {
  let fixture: ComponentFixture<RolesListComponent>;
  let component: RolesListComponent;
  const adminServiceStub = createServiceStub(['assignRolePermissions', 'createRole', 'getAuditLogs', 'getRolePermissions', 'getRoles', 'getUsers', 'updateRole']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      RolesListComponent,
      [
        { provide: AdminService, useValue: adminServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
