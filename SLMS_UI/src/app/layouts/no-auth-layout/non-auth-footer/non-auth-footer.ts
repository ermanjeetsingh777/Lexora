import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-non-auth-footer',
  imports: [AppIconComponent, RouterLink],
  templateUrl: './non-auth-footer.html',
  styleUrl: './non-auth-footer.css',
})
export class NonAuthFooter {}
