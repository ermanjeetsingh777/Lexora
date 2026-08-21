import type { HoursException } from './library-detail.models';

export type LibraryCalendarDayStatus = 'open' | 'closed' | 'holiday' | 'exception';

export interface LibraryCalendarDay {
  date: string;
  day: string;
  status: LibraryCalendarDayStatus;
  closed: boolean;
  open?: string | null;
  close?: string | null;
  label?: string | null;
  isException: boolean;
  source: string;
}

export interface LibraryCalendarView {
  libraryId: string;
  libraryName: string;
  startDate: string;
  endDate: string;
  days: LibraryCalendarDay[];
  exceptions: HoursException[];
}

export interface LibraryCalendarQuery {
  startDate: string;
  endDate: string;
}
