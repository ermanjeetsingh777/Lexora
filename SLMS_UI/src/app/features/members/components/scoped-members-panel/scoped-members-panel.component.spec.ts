import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScopedMembersPanelComponent } from './scoped-members-panel.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { MemberService } from '../../MemberService';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import { CommonService } from '@core/services/common.service';

describe('ScopedMembersPanelComponent', () => {
  let fixture: ComponentFixture<ScopedMembersPanelComponent>;
  let component: ScopedMembersPanelComponent;
  const memberServiceStub = createServiceStub(['getBranchMembers', 'getInstitutionMembers', 'getLibraryMember']);
  const attendanceExportServiceStub = createServiceStub(['fetchAllModuleRecords']);
  const commonServiceStub = createServiceStub([]);

  beforeEach(async () => {
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
    fixture.componentRef.setInput('scope', null);
    fixture.componentRef.setInput('institutionId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
