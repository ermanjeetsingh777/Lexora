import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppLogoComponent } from '@shared/components/app-logo/app-logo.component';

@Component({
  selector: 'app-non-auth-footer',
  imports: [AppLogoComponent, RouterLink],
  templateUrl: './non-auth-footer.html',
  styleUrl: './non-auth-footer.css',
})
export class NonAuthFooter {}
