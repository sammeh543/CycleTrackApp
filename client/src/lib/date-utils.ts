// Format a date to YYYY-MM-DD format (ISO date string without time)
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse a date string (YYYY-MM-DD) into a Date object
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

// Check if two dates are the same day (ignoring time)
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Format a date to a more readable format (e.g., "Apr 25, 2025")
export function formatReadableDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get the first day of the month
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Get the last day of the month
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Add days to a date
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Subtract days from a date
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

// Get the difference in days between two dates
export function getDaysDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}