import { format, parseISO } from 'date-fns';
import { getBestCyclePredictionLengths, getCyclePhase } from './cycle-utils';

/**
 * Data-driven phase calculation: Only returns 'period' for logged or filled days, otherwise calculates phase using user data.
 * @param dateToCheck The date to check the phase for
 * @param flowRecords Array of { date, intensity } objects
 * @param userSettings User settings with defaultCycleLength/defaultPeriodLength
 * @param fillOngoingPeriodDates Array of dates (ISO string) to treat as period (for ongoing fill)
 * @returns The phase name: 'period' | 'follicular' | 'ovulation' | 'luteal' | 'Unknown'
 */
export function getDataDrivenCyclePhase(
  dateToCheck: Date | string,
  flowRecords: Array<{ date: string; intensity: string }>,
  userSettings?: { defaultCycleLength?: number; defaultPeriodLength?: number },
  fillOngoingPeriodDates: string[] = [],
  anchorDate?: Date
): 'period' | 'follicular' | 'ovulation' | 'luteal' | 'Unknown' {
  const checkDate = typeof dateToCheck === 'string' ? parseISO(dateToCheck) : new Date(dateToCheck);
  
  // Sort all records chronologically ONCE
  const periodRecords = flowRecords
    .filter(r => r.intensity !== 'spotting')
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  // Find all period days (logged)
  const periodDates = new Set(periodRecords.map(r => r.date));
  // Add ongoing fill days
  fillOngoingPeriodDates.forEach(d => periodDates.add(d));

  // If this day is a logged or filled period day, return 'period'
  const checkDateStr = format(checkDate, 'yyyy-MM-dd');
  if (periodDates.has(checkDateStr)) return 'period';

  // Otherwise, use the last period start and user settings to calculate phase
  let anchor = anchorDate;
  if (!anchor) {
    // Find the most recent period start before or on this date
    // Records are already sorted chronologically, so scan backwards
    for (let i = periodRecords.length - 1; i >= 0; i--) {
      const record = periodRecords[i];
      const recordDate = parseISO(record.date);
      if (recordDate <= checkDate) {
        anchor = recordDate;
        break;
      }
    }
    if (!anchor) return 'Unknown';
  }

  // Get user-specific averages
  const { avgCycleLength, avgPeriodLength } = getBestCyclePredictionLengths(flowRecords, userSettings);

  // Use the original getCyclePhase logic, but NEVER allow 'period' for unlogged days
  const phase = getCyclePhase(checkDate, anchor, avgCycleLength, avgPeriodLength);
  if (phase === 'period') return 'follicular'; // treat as follicular if not logged
  return phase;
}