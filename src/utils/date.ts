import { format, isToday, isYesterday, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

/** Format a date string to Hebrew display */
export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'היום';
  if (isYesterday(date)) return 'אתמול';
  return format(date, 'd בMMMM yyyy', { locale: he });
}

/** Format short date (day/month) */
export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM');
}

/** Hebrew month names */
export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export function hebrewMonth(month: number): string {
  return HEBREW_MONTHS[month - 1] ?? '';
}

/** Returns { start, end } ISO strings for a given month */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const date = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

/** Current month and year */
export function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
