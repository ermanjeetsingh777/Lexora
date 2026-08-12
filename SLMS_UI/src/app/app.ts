import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PreloaderService } from '@core/services/preloader.service';
import { environment } from '@env/environment';
import { ToastHostComponent } from '@shared/components/toast/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly preloader = inject(PreloaderService);
  protected readonly title = signal(environment.appName);

  ngAfterViewInit() {
    this.preloader.hide();
  }
}
