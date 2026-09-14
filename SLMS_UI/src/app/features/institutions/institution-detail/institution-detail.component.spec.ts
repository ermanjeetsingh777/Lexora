import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionDetailComponent } from './institution-detail.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '../institutions.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { AuthService } from '@core/services/auth.service';

describe('InstitutionDetailComponent', () => {
  let fixture: ComponentFixture<InstitutionDetailComponent>;
  let component: InstitutionDetailComponent;
  const institutionsServiceStub = createServiceStub(['getBilling', 'getBranchesView', 'getById', 'getLibrariesView', 'getOverview', 'updateInstitution']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateBranch', 'canCreateLibrary']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      InstitutionDetailComponent,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(InstitutionDetailComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
