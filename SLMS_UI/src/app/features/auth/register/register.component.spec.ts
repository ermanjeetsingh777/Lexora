import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { AuthService } from '@core/services/auth.service';
import { PackageService } from '@core/services/package.service';
import { AddonService } from '@core/services/addon.service';
import { CommonService } from '@core/services/common.service';
import { WorkspaceSetupNoticeService } from '@core/services/workspace-setup-notice.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'register', 'user']);
  const packageServiceStub = createServiceStub(['getActivePackages']);
  const addonServiceStub = createServiceStub(['getActiveAddons']);
  const commonServiceStub = createServiceStub([]);
  const workspaceSetupNoticeServiceStub = createServiceStub(['remember']);

  beforeEach(async () => {
    await configureComponentTestBed(
      RegisterComponent,
      [
        { provide: AuthService, useValue: authServiceStub },
        { provide: PackageService, useValue: packageServiceStub },
        { provide: AddonService, useValue: addonServiceStub },
        { provide: CommonService, useValue: commonServiceStub },
        { provide: WorkspaceSetupNoticeService, useValue: workspaceSetupNoticeServiceStub },
      ],
    );
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
