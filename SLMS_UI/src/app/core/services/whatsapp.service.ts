import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {

  send(phone: string, message: string): void {

    // Remove spaces, +91, -, etc.
    phone = phone.replace(/\D/g, '');

    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  }

  paymentSuccess(phone: string, memberName: string,amount: number, plan: string,expiryDate: string, libraryName: string): void {

    const message = `🎉 *Payment Successful*

Hello ${memberName},

Your payment has been received successfully.

💰 Amount : ₹${amount}
📚 Plan : ${plan}
📅 Valid Till : ${expiryDate}

Thank you for choosing our library.

Regards,
${libraryName}`;

    this.send(phone, message);
  }

  paymentPending(phone: string,memberName: string,amount: number, dueDate: string, libraryName: string ): void {

    const message = `⚠️ *Payment Pending*

Hello ${memberName},

Your membership payment is still pending.

💰 Amount : ₹${amount}
📅 Due Date : ${dueDate}

Please complete your payment before the due date.

Regards,
${libraryName}`;

    this.send(phone, message);
  }

  paymentReminder(phone: string, memberName: string, amount: number, dueDate: string, libraryName: string ): void {

    const message = `🔔 *Payment Reminder*

Hello ${memberName},

This is a friendly reminder.

💰 Amount : ₹${amount}
📅 Due Date : ${dueDate}

Kindly pay before the due date.

Regards,
${libraryName}`;

    this.send(phone, message);
  }

  attendanceAbsent(phone: string,memberName: string, libraryName: string): void {

    const message = `⚠️ *Attendance Alert*

Hello,

${memberName} was absent today.

Regards,
${libraryName}`;

    this.send(phone, message);
  }
}