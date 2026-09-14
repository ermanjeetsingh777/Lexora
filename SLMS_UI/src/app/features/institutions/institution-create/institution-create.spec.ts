import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionCreate } from './institution-create';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '../institutions.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { CommonService } from '@core/services/common.service';

describe('InstitutionCreate', () => {
  let fixture: ComponentFixture<InstitutionCreate>;
  let component: InstitutionCreate;
  const institutionsServiceStub = createServiceStub(['createInstitution', 'deactivateInstitution', 'institutionById', 'patchInstitutionLocal']);
  const organizationEntitlementServiceStub = createServiceStub(['load', 'refresh']);
  const commonServiceStub = createServiceStub([]);

  beforeEach(async () => {
    await configureComponentTestBed(
      InstitutionCreate,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
      ],
    );
    fixture = TestBed.createComponent(InstitutionCreate);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
