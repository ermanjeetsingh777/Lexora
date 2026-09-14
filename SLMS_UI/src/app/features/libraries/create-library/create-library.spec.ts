import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateLibrary } from './create-library';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { BranchService } from '@features/branches/branch.service';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { CommonService } from '@core/services/common.service';
import { LibraryService } from '../library.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';

describe('CreateLibrary', () => {
  let fixture: ComponentFixture<CreateLibrary>;
  let component: CreateLibrary;
  const branchServiceStub = createServiceStub(['getDetailView']);
  const institutionsServiceStub = createServiceStub(['getBranchesView', 'getById', 'getInstitutionBranchForDropdown']);
  const commonServiceStub = createServiceStub([]);
  const libraryServiceStub = createServiceStub(['createlibrary', 'getBranchCapacitySummary']);
  const organizationEntitlementServiceStub = createServiceStub(['load', 'refresh']);

  beforeEach(async () => {
    await configureComponentTestBed(
      CreateLibrary,
      [
        { provide: BranchService, useValue: branchServiceStub },
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
        { provide: LibraryService, useValue: libraryServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
      ],
    );
    fixture = TestBed.createComponent(CreateLibrary);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call BranchService.getDetailView when loadBranchContext()', () => {
    branchServiceStub.getDetailView.mockClear();
    invokeComponentMethod(component, 'loadBranchContext', ['00000000-0000-0000-0000-000000000001']);
    expect(branchServiceStub.getDetailView).toHaveBeenCalled();
  });
});
