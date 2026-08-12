import { Component } from '@angular/core';
import { AppIconComponent } from "../../shared/components/app-icon/app-icon.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-term-of-service',
  imports: [AppIconComponent, RouterLink],
  templateUrl: './term-of-service.html',
  styleUrl: './term-of-service.css',
})
export class TermOfService {}
