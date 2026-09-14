import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditMemberComponent } from './edit-member-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { MemberService } from '../MemberService';

describe('EditMemberComponent', () => {
  let fixture: ComponentFixture<EditMemberComponent>;
  let component: EditMemberComponent;
  const memberServiceStub = createServiceStub(['getMemberById', 'getPhotoUrl', 'updateMember', 'uploadAadhaar', 'uploadPhoto']);

  beforeEach(async () => {
    await configureComponentTestBed(
      EditMemberComponent,
      [
        { provide: MemberService, useValue: memberServiceStub },
      ],
    );
    fixture = TestBed.createComponent(EditMemberComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
