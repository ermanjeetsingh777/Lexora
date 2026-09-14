import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BranchCreate } from './branch-create';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { CommonService } from '@core/services/common.service';
import { BranchService } from '../branch.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';

describe('BranchCreate', () => {
  let fixture: ComponentFixture<BranchCreate>;
  let component: BranchCreate;
  const institutionsServiceStub = createServiceStub(['getById', 'getInstitutionBranchForDropdown']);
  const commonServiceStub = createServiceStub([]);
  const branchServiceStub = createServiceStub(['createBranches']);
  const organizationEntitlementServiceStub = createServiceStub(['load', 'refresh']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BranchCreate,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
        { provide: BranchService, useValue: branchServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BranchCreate);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
