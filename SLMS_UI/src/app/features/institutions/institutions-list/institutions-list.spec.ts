import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionsListComponent } from './institutions-list';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '../institutions.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { AuthService } from '@core/services/auth.service';

describe('InstitutionsListComponent', () => {
  let fixture: ComponentFixture<InstitutionsListComponent>;
  let component: InstitutionsListComponent;
  const institutionsServiceStub = createServiceStub(['getListView', 'getQuickView']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateInstitution', 'load']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      InstitutionsListComponent,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(InstitutionsListComponent);
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

  it('should call InstitutionsService.getQuickView when loadQuickView()', () => {
    institutionsServiceStub.getQuickView.mockClear();
    invokeComponentMethod(component, 'loadQuickView', ['00000000-0000-0000-0000-000000000001']);
    expect(institutionsServiceStub.getQuickView).toHaveBeenCalled();
  });
});
