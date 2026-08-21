import { Injectable } from '@angular/core';

const DEVICE_ID_KEY = 'slms_kiosk_device_id';
const MEMBER_BINDING_KEY = 'slms_kiosk_member_binding';

interface KioskMemberBinding {
  memberId: string;
  memberName: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class KioskDeviceService {
  getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  getStaffDeviceId(): string {
    return `staff:${this.getDeviceId()}`;
  }

  bindMember(memberId: string, memberName: string): void {
    localStorage.setItem(
      MEMBER_BINDING_KEY,
      JSON.stringify({
        memberId,
        memberName,
        date: this.todayKey(),
      } satisfies KioskMemberBinding),
    );
  }

  validateMemberAccess(memberId: string): string | null {
    const binding = this.readBinding();
    if (!binding) {
      return null;
    }

    if (binding.memberId === memberId) {
      return null;
    }

    return `This device is already used for ${binding.memberName}'s attendance today. One device can mark attendance for only one member.`;
  }

  clearExpiredBinding(): void {
    const raw = localStorage.getItem(MEMBER_BINDING_KEY);
    if (!raw) {
      return;
    }

    try {
      const binding = JSON.parse(raw) as KioskMemberBinding;
      if (binding.date !== this.todayKey()) {
        localStorage.removeItem(MEMBER_BINDING_KEY);
      }
    } catch {
      localStorage.removeItem(MEMBER_BINDING_KEY);
    }
  }

  private readBinding(): KioskMemberBinding | null {
    this.clearExpiredBinding();
    const raw = localStorage.getItem(MEMBER_BINDING_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as KioskMemberBinding;
    } catch {
      localStorage.removeItem(MEMBER_BINDING_KEY);
      return null;
    }
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
