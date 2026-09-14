import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemberAvatarComponent } from './member-avatar.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { CommonService } from '@core/services/common.service';
import { MemberPhotoService } from '@features/members/member-photo.service';

describe('MemberAvatarComponent', () => {
  let fixture: ComponentFixture<MemberAvatarComponent>;
  let component: MemberAvatarComponent;
  const commonServiceStub = createServiceStub([]);
  const memberPhotoServiceStub = createServiceStub(['getPhotoUrl']);

  beforeEach(async () => {
    await configureComponentTestBed(
      MemberAvatarComponent,
      [
        { provide: CommonService, useValue: commonServiceStub },
        { provide: MemberPhotoService, useValue: memberPhotoServiceStub },
      ],
    );
    fixture = TestBed.createComponent(MemberAvatarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('memberId', '00000000-0000-0000-0000-000000000001');
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
