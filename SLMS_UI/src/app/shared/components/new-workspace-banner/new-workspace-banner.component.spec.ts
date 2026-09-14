import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewWorkspaceBannerComponent } from './new-workspace-banner.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { WorkspaceSetupNoticeService } from '@core/services/workspace-setup-notice.service';

describe('NewWorkspaceBannerComponent', () => {
  let fixture: ComponentFixture<NewWorkspaceBannerComponent>;
  let component: NewWorkspaceBannerComponent;
  const workspaceSetupNoticeServiceStub = createServiceStub(['dismiss', 'noticeFor']);

  beforeEach(async () => {
    await configureComponentTestBed(
      NewWorkspaceBannerComponent,
      [
        { provide: WorkspaceSetupNoticeService, useValue: workspaceSetupNoticeServiceStub },
      ],
    );
    fixture = TestBed.createComponent(NewWorkspaceBannerComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call WorkspaceSetupNoticeService.dismiss when dismiss()', () => {
    workspaceSetupNoticeServiceStub.dismiss.mockClear();
    invokeComponentMethod(component, 'dismiss');
    expect(workspaceSetupNoticeServiceStub.dismiss).toHaveBeenCalled();
  });
});
