import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LibraryEdit } from './library-edit';
import {
  configureComponentTestBed,
  createServiceStub,
  detectChangesStable,
  invokeComponentMethod,
} from '@testing/component-test';
import { LibraryService } from '../library.service';

describe('LibraryEdit', () => {
  let fixture: ComponentFixture<LibraryEdit>;
  let component: LibraryEdit;
  const libraryServiceStub = createServiceStub(['getBranchCapacitySummary', 'getDetailView', 'updateLibrary']);

  beforeEach(async () => {
    await configureComponentTestBed(
      LibraryEdit,
      [
        { provide: LibraryService, useValue: libraryServiceStub },
      ],
    );
    fixture = TestBed.createComponent(LibraryEdit);
    component = fixture.componentInstance;
    await detectChangesStable(fixture);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call LibraryService.getBranchCapacitySummary when loadCapacitySummary()', () => {
    libraryServiceStub.getBranchCapacitySummary.mockClear();
    invokeComponentMethod(component, 'loadCapacitySummary', ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001']);
    expect(libraryServiceStub.getBranchCapacitySummary).toHaveBeenCalled();
  });
});
