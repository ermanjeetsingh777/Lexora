import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import jsQR from 'jsqr';
import { QrScannerModalService } from '@core/services/qr-scanner-modal.service';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-qr-camera-scanner-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './qr-camera-scanner-modal.component.html',
  styleUrl: './qr-camera-scanner-modal.component.css',
})
export class QrCameraScannerModalComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  protected readonly modalService = inject(QrScannerModalService);

  @ViewChild('videoElem') videoElementRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElem') canvasElementRef?: ElementRef<HTMLCanvasElement>;

  readonly isStarting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hasCamera = signal(true);
  readonly facingMode = signal<'environment' | 'user'>('environment');
  readonly scannedCode = signal<string | null>(null);

  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isScanning = false;
  private hiddenCanvas: HTMLCanvasElement | null = null;
  private hiddenCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    effect(() => {
      const open = this.modalService.isOpen();
      if (open) {
        this.errorMessage.set(null);
        this.scannedCode.set(null);
        this.isStarting.set(true);
        setTimeout(() => {
          this.startCamera();
        }, 80);
      } else {
        this.stopCamera();
      }
    });
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.hiddenCanvas = document.createElement('canvas');
      this.hiddenCtx = this.hiddenCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  close(): void {
    this.modalService.close();
    this.stopCamera();
    this.errorMessage.set(null);
    this.scannedCode.set(null);
  }

  async toggleFacingMode(): Promise<void> {
    this.facingMode.update((mode) => (mode === 'environment' ? 'user' : 'environment'));
    this.stopCamera();
    await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    this.isStarting.set(true);
    this.errorMessage.set(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorMessage.set('Camera access is not supported on this browser or connection (HTTPS required).');
      this.isStarting.set(false);
      this.hasCamera.set(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: this.facingMode() },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = this.videoElementRef?.nativeElement;
      if (video) {
        video.srcObject = this.mediaStream;
        video.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await video.play();
        this.isStarting.set(false);
        this.startScanningLoop();
      }
    } catch (err: any) {
      this.isStarting.set(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.errorMessage.set('Camera permission was denied. Please allow camera access in browser permissions to scan QR code.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.errorMessage.set('No camera found on this device.');
      } else {
        this.errorMessage.set('Could not access camera: ' + (err.message || 'Unknown error'));
      }
    }
  }

  private stopCamera(): void {
    this.isScanning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.mediaStream = null;
    }
    this.isStarting.set(false);
  }

  private startScanningLoop(): void {
    this.isScanning = true;

    const scan = () => {
      if (!this.isScanning || !this.modalService.isOpen()) return;

      const video = this.videoElementRef?.nativeElement;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0 && this.hiddenCanvas && this.hiddenCtx) {
          if (this.hiddenCanvas.width !== width || this.hiddenCanvas.height !== height) {
            this.hiddenCanvas.width = width;
            this.hiddenCanvas.height = height;
          }

          this.hiddenCtx.drawImage(video, 0, 0, width, height);
          const imageData = this.hiddenCtx.getImageData(0, 0, width, height);

          // Fast JS QR decoding
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            this.handleScannedValue(code.data);
            return;
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(scan);
    };

    this.animationFrameId = requestAnimationFrame(scan);
  }

  private handleScannedValue(rawText: string): void {
    const trimmed = (rawText || '').trim();
    if (!trimmed) return;

    this.scannedCode.set(trimmed);
    this.stopCamera();

    // Haptic feedback if available on mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch {}
    }

    this.navigateToTarget(trimmed);
  }

  navigateToTarget(urlOrToken: string): void {
    const cleaned = urlOrToken.trim();

    // Full URL handling
    try {
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        const parsed = new URL(cleaned);
        const path = parsed.pathname;

        if (path.includes('/kiosk/attendance/library') || path.includes('/kiosk/attendance/member')) {
          this.close();
          const token = parsed.searchParams.get('token');
          const targetRoute = path.includes('/member')
            ? '/kiosk/attendance/member'
            : '/kiosk/attendance/library';
          this.router.navigate([targetRoute], {
            queryParams: token ? { token } : undefined,
          });
          return;
        }

        // External or other internal URL
        this.close();
        window.location.href = cleaned;
        return;
      }
    } catch {}

    // Relative path handling
    if (cleaned.startsWith('/kiosk/') || cleaned.startsWith('kiosk/')) {
      this.close();
      const normalized = cleaned.startsWith('/') ? cleaned : '/' + cleaned;
      this.router.navigateByUrl(normalized);
      return;
    }

    // Direct token string
    this.close();
    this.router.navigate(['/kiosk/attendance/library'], { queryParams: { token: cleaned } });
  }

  onManualSubmit(inputElement: HTMLInputElement): void {
    const val = inputElement.value.trim();
    if (val) {
      this.handleScannedValue(val);
    }
  }
}
