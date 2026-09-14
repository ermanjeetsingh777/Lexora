import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MembersListComponent } from './members-list-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { MemberService } from '../MemberService';
import { AuthService } from '@core/services/auth.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { AttendanceExportService } from '@features/attendance/attendance-export.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { CommonService } from '@core/services/common.service';

describe('MembersListComponent', () => {
  let fixture: ComponentFixture<MembersListComponent>;
  let component: MembersListComponent;
  const memberServiceStub = createServiceStub(['changeMemberPassword', 'changePlanOrShift', 'getAllMembers', 'getLibraryPlan', 'getMemberById', 'getMembershipSummary', 'renewMembership']);
  // Paged list shape expected by members page effect.
  memberServiceStub.getAllMembers.mockReturnValue(
    of({ success: true, data: { items: [], pageNumber: 1, pageSize: 12, totalCount: 0, totalPages: 1 }, message: '', errors: null }),
  );
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateMember', 'load']);
  const attendanceExportServiceStub = createServiceStub(['fetchAllModuleRecords']);
  const whatsAppServiceStub = createServiceStub(['membershipRenewalPayment']);
  const commonServiceStub = createServiceStub([]);

  beforeEach(async () => {
    await configureComponentTestBed(
      MembersListComponent,
      [
        { provide: MemberService, useValue: memberServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: AttendanceExportService, useValue: attendanceExportServiceStub },
        { provide: WhatsAppService, useValue: whatsAppServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
      ],
    );
    fixture = TestBed.createComponent(MembersListComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call MemberService.getMembershipSummary when loadAllMembers()', () => {
    memberServiceStub.getMembershipSummary.mockClear();
    invokeComponentMethod(component, 'loadAllMembers');
    expect(memberServiceStub.getMembershipSummary).toHaveBeenCalled();
  });
});
