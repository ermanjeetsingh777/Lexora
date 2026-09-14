import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { ProfileService } from './profile.service';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  const profileServiceStub = createServiceStub(['changePassword', 'getProfile', 'updateProfile']);

  beforeEach(async () => {
    await configureComponentTestBed(
      ProfileComponent,
      [
        { provide: ProfileService, useValue: profileServiceStub },
      ],
    );
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call ProfileService.getProfile when refreshProfile()', () => {
    profileServiceStub.getProfile.mockClear();
    invokeComponentMethod(component, 'refreshProfile');
    expect(profileServiceStub.getProfile).toHaveBeenCalled();
  });
});
