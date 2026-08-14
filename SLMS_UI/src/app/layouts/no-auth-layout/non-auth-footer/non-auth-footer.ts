import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-non-auth-footer',
  imports: [RouterLink],
  templateUrl: './non-auth-footer.html',
  styleUrl: './non-auth-footer.css',
})
export class NonAuthFooter {}
