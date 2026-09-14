import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryListComponent } from './library-list-component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { LibraryService } from '../library.service';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';
import { AuthService } from '@core/services/auth.service';

describe('LibraryListComponent', () => {
  let fixture: ComponentFixture<LibraryListComponent>;
  let component: LibraryListComponent;
  const libraryServiceStub = createServiceStub(['getListRevenueSummary', 'getListView']);
  const organizationEntitlementServiceStub = createServiceStub(['canCreateLibrary', 'load']);
  const authServiceStub = createServiceStub(['currentUser', 'hasPermission', 'hasRole', 'isAuthenticated', 'user']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LibraryListComponent,
      [
        { provide: LibraryService, useValue: libraryServiceStub },
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LibraryListComponent);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call OrganizationEntitlementService.load when load()', () => {
    organizationEntitlementServiceStub.load.mockClear();
    invokeComponentMethod(component, 'load');
    expect(organizationEntitlementServiceStub.load).toHaveBeenCalled();
  });
});
