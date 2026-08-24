import { Pipe, PipeTransform } from '@angular/core';
import { formatAppDate, formatAppDateTime, formatAppTime } from '@core/utils/date-format.util';

@Pipe({ name: 'appDate', standalone: true })
export class AppDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatAppDate(value);
  }
}

@Pipe({ name: 'appDateTime', standalone: true })
export class AppDateTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatAppDateTime(value);
  }
}

@Pipe({ name: 'appTime', standalone: true })
export class AppTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatAppTime(value);
  }
}
