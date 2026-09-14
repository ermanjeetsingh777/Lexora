import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateMemberComponent } from './create-member-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { MemberService } from '../MemberService';
import { BranchService } from '@features/branches/branch.service';
import { LibraryService } from '@features/libraries/library.service';
import { CommonService } from '@core/services/common.service';

describe('CreateMemberComponent', () => {
  let fixture: ComponentFixture<CreateMemberComponent>;
  let component: CreateMemberComponent;
  const institutionsServiceStub = createServiceStub(['getInstitutionBranchForDropdown']);
  const memberServiceStub = createServiceStub(['createMember', 'getLibraryPlan', 'uploadAadhaar', 'uploadPhoto']);
  const branchServiceStub = createServiceStub(['getDetailView']);
  const libraryServiceStub = createServiceStub(['getDetailView']);
  const commonServiceStub = createServiceStub([]);

  beforeEach(async () => {
    await configureComponentTestBed(
      CreateMemberComponent,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: MemberService, useValue: memberServiceStub },
        { provide: BranchService, useValue: branchServiceStub },
        { provide: LibraryService, useValue: libraryServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
      ],
    );
    fixture = TestBed.createComponent(CreateMemberComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
