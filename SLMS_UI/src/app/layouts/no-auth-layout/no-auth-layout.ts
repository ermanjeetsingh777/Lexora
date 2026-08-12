import { Component } from '@angular/core';
import { NonAuthHeader } from "./non-auth-header/non-auth-header";
import { NonAuthFooter } from "./non-auth-footer/non-auth-footer";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-no-auth-layout',
  imports: [NonAuthHeader, NonAuthFooter, RouterOutlet],
  templateUrl: './no-auth-layout.html',
  styleUrl: './no-auth-layout.css',
})
export class NoAuthLayout {}
