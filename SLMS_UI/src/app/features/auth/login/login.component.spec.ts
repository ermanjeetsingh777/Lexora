import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';
import { CommonService } from '@core/services/common.service';
import { MemberPortalService } from '@core/services/member-portal.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'isMemberPortalUser', 'login', 'user']);
  const commonServiceStub = createServiceStub([]);
  const memberPortalServiceStub = createServiceStub(['resolveMemberId']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LoginComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
        { provide: MemberPortalService, useValue: memberPortalServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
