import { Component } from '@angular/core';
import { InstitutionCreate } from '@features/institutions/institution-create/institution-create';

@Component({
  selector: 'app-on-boarding-institution',
  imports: [InstitutionCreate],
  templateUrl: './on-boarding-institution.html',
  styleUrl: './on-boarding-institution.css',
})
export class OnBoardingInstitution {}
