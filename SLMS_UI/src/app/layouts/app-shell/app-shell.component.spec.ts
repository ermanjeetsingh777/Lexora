import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppShellComponent } from './app-shell.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { MemberPortalService } from '@core/services/member-portal.service';

describe('AppShellComponent', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let component: AppShellComponent;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'isMemberPortalUser', 'user']);
  const organizationEntitlementServiceStub = createServiceStub(['load']);
  const memberPortalServiceStub = createServiceStub(['resolveMemberId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      AppShellComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: MemberPortalService, useValue: memberPortalServiceStub },
      ],
    );
    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
