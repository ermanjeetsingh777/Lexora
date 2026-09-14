import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BulkUploadMembersComponent } from './bulk-upload-members-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { InstitutionsService } from '@features/institutions/institutions.service';
import { MemberService } from '../MemberService';

describe('BulkUploadMembersComponent', () => {
  let fixture: ComponentFixture<BulkUploadMembersComponent>;
  let component: BulkUploadMembersComponent;
  const institutionsServiceStub = createServiceStub(['getInstitutionBranchForDropdown']);
  const memberServiceStub = createServiceStub(['createMember', 'downloadBulkTemplate', 'getLibraryPlan']);

  beforeEach(async () => {
    await configureComponentTestBed(
      BulkUploadMembersComponent,
      [
        { provide: InstitutionsService, useValue: institutionsServiceStub },
        { provide: MemberService, useValue: memberServiceStub },
      ],
    );
    fixture = TestBed.createComponent(BulkUploadMembersComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
