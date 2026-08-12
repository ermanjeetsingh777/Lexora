import { Component } from '@angular/core';
import { CreateLibrary } from '@features/libraries/create-library/create-library';

@Component({
  selector: 'app-on-boarding-library',
  imports: [CreateLibrary],
  templateUrl: './on-boarding-library.html',
  styleUrl: './on-boarding-library.css',
})
export class OnBoardingLibrary {}
