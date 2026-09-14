import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ScopedMembersPanelComponent } from './scoped-members-panel.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
} from '@testing/component-test';
import { MemberService } from '../../MemberService';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import { CommonService } from '@core/services/common.service';

describe('ScopedMembersPanelComponent', () => {
  let fixture: ComponentFixture<ScopedMembersPanelComponent>;
  let component: ScopedMembersPanelComponent;
  const emptyPage = {
    success: true,
    data: {
      items: [],
      pageNumber: 1,
      pageSize: 12,
      totalCount: 0,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    message: '',
    errors: null,
  };
  const memberServiceStub = createServiceStub([
    'getBranchMembers',
    'getInstitutionMembers',
    'getLibraryMember',
  ]);
  memberServiceStub.getInstitutionMembers.mockReturnValue(of(emptyPage));
  memberServiceStub.getBranchMembers.mockReturnValue(of(emptyPage));
  memberServiceStub.getLibraryMember.mockReturnValue(of(emptyPage));
  const attendanceExportServiceStub = createServiceStub(['fetchAllModuleRecords']);
  const commonServiceStub = createServiceStub(['planClasses']);
  commonServiceStub.planClasses.mockReturnValue('');

  beforeEach(async () => {
    memberServiceStub.getInstitutionMembers.mockClear();
    await configureComponentTestBed(
      ScopedMembersPanelComponent,
      [
        { provide: MemberService, useValue: memberServiceStub },
        { provide: AttendanceExportService, useValue: attendanceExportServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
      ],
    );
    fixture = TestBed.createComponent(ScopedMembersPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('scope', 'institution');
    fixture.componentRef.setInput('institutionId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose server page size options and default page size', () => {
    expect(component.PAGE_SIZE_OPTS).toEqual([12, 24, 48]);
    expect(component.pageSize()).toBe(12);
  });

  it('should load institution members with MemberListQuery', () => {
    expect(memberServiceStub.getInstitutionMembers).toHaveBeenCalled();
    const query = memberServiceStub.getInstitutionMembers.mock.calls.at(-1)?.[1];
    expect(query?.page).toBe(1);
    expect(query?.pageSize).toBe(12);
  });
});
