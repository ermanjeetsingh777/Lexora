import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeoFaqComponent } from './seo-faq.component';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';

describe('SeoFaqComponent', () => {
  let fixture: ComponentFixture<SeoFaqComponent>;
  let component: SeoFaqComponent;

  beforeEach(async () => {
    await configureComponentTestBed(SeoFaqComponent);
    fixture = TestBed.createComponent(SeoFaqComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('faqs', []);
    fixture.componentRef.setInput('answerSummary', null);
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
