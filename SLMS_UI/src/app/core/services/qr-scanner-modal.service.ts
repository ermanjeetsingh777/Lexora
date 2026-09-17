import { Injectable, signal } from '@angular/core';

export type QrScanHandler = (raw: string) => void | boolean;

@Injectable({
  providedIn: 'root',
})
export class QrScannerModalService {
  readonly isOpen = signal(false);

  private scanHandler: QrScanHandler | null = null;

  /**
   * Open the camera scanner. If `onScan` is provided and returns true (or void),
   * the default kiosk navigation is skipped.
   */
  open(onScan?: QrScanHandler): void {
    this.scanHandler = onScan ?? null;
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.scanHandler = null;
  }

  /** @returns true when a custom handler consumed the scan */
  consumeScan(raw: string): boolean {
    const handler = this.scanHandler;
    if (!handler) return false;
    const result = handler(raw);
    return result !== false;
  }
}
