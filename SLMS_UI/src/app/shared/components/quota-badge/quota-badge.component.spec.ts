import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuotaBadgeComponent } from './quota-badge.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { OrganizationEntitlementService } from '@core/services/organization-entitlement.service';

describe('QuotaBadgeComponent', () => {
  let fixture: ComponentFixture<QuotaBadgeComponent>;
  let component: QuotaBadgeComponent;
  const organizationEntitlementServiceStub = createServiceStub(['branchQuota', 'institutionQuota', 'libraryQuota', 'memberQuota', 'userQuota']);

  beforeEach(async () => {
    await configureComponentTestBed(
      QuotaBadgeComponent,
      [
        { provide: OrganizationEntitlementService, useValue: organizationEntitlementServiceStub },
      ],
    );
    fixture = TestBed.createComponent(QuotaBadgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('resourceType', null);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
