import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { AttendanceSeatOption } from '@core/models/attendanceModels';

@Component({
  selector: 'app-attendance-seat-picker',
  standalone: true,
  imports: [NgClass],
  templateUrl: './attendance-seat-picker.component.html',
  styleUrl: './attendance-seat-picker.component.css',
})
export class AttendanceSeatPickerComponent {
  readonly seats = input<AttendanceSeatOption[]>([]);
  readonly loading = input(false);
  readonly selectedSeatNumber = input<string | null>(null);
  readonly disabled = input(false);

  readonly seatSelected = output<string>();

  isSelectable(seat: AttendanceSeatOption): boolean {
    if (this.disabled()) return false;
    if (!seat.isActive) return false;
    if (seat.isOccupied) return false;
    return true;
  }

  selectSeat(seat: AttendanceSeatOption): void {
    if (!this.isSelectable(seat)) return;
    this.seatSelected.emit(seat.seatNumber);
  }

  seatClass(seat: AttendanceSeatOption): string {
    const selected = this.selectedSeatNumber() === seat.seatNumber;
    if (selected) return 'seat-chip seat-chip--selected';
    if (!seat.isActive) return 'seat-chip seat-chip--maintenance';
    if (seat.isOccupied) return 'seat-chip seat-chip--occupied';
    return 'seat-chip seat-chip--available';
  }

  seatTitle(seat: AttendanceSeatOption): string {
    if (!seat.isActive) return `${seat.seatNumber} — maintenance`;
    if (seat.isOccupied) return `${seat.seatNumber} — occupied${seat.occupiedBy ? ` (${seat.occupiedBy})` : ''}`;
    return `${seat.seatNumber} — available`;
  }
}
