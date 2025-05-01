import { addDays, differenceInDays, parseISO, endOfDay, isAfter, isBefore } from 'date-fns';

/**
 * Determines the phase of menstrual cycle
 * @param dateToCheck The date to check the phase for
 * @param lastPeriodStartDate The start date of the last period
 * @param avgCycleLength Average cycle length in days (default 28)
 * @param avgPeriodLength Average period length in days (default 5)
 * @returns The phase name: 'period' | 'follicular' | 'ovulation' | 'luteal'
 */
export function getCyclePhase(
  dateToCheck: Date | string, 
  lastPeriodStartDate: Date | string, 
  avgCycleLength = 28,
  avgPeriodLength = 5
): 'period' | 'follicular' | 'ovulation' | 'luteal' {
  // Convert string dates to Date objects if needed
  const start = typeof lastPeriodStartDate === 'string' 
    ? parseISO(lastPeriodStartDate) 
    : new Date(lastPeriodStartDate);
    
  const checkDate = typeof dateToCheck === 'string' 
    ? parseISO(dateToCheck) 
    : new Date(dateToCheck);

  const diffInDays = differenceInDays(checkDate, start);
  
  // Calculate ovulation day (typically 14 days before the end of cycle)
  const ovulationDay = Math.round(avgCycleLength - 14);
  
  // Follicular phase starts after period ends and goes until ovulation
  const follicularStart = avgPeriodLength + 1;
  const follicularEnd = ovulationDay - 1;
  
  // If the date is before the last period start
  if (diffInDays < 0) {
    // Calculate how many complete cycles between the dates
    const completeCycles = Math.floor(Math.abs(diffInDays) / avgCycleLength);
    // Calculate remaining days in the current cycle
    const remainingDays = Math.abs(diffInDays) % avgCycleLength;
    // Calculate which day in the previous cycle, counting backwards from the start
    const prevCycleDay = avgCycleLength - remainingDays;
    
    // Apply the same phase logic to the previous cycle
    if (prevCycleDay >= 1 && prevCycleDay <= avgPeriodLength) return 'period';
    if (prevCycleDay >= follicularStart && prevCycleDay <= follicularEnd) return 'follicular';
    if (prevCycleDay === ovulationDay) return 'ovulation';
    if (prevCycleDay > ovulationDay && prevCycleDay <= avgCycleLength) return 'luteal';
  }
  
  // For dates after or on the last period start 
  const cycleDay = (diffInDays % avgCycleLength) + 1;

  // For the current or future cycles
  if (cycleDay >= 1 && cycleDay <= avgPeriodLength) return 'period';
  if (cycleDay >= follicularStart && cycleDay <= follicularEnd) return 'follicular';
  if (cycleDay === ovulationDay) return 'ovulation';
  if (cycleDay > ovulationDay && cycleDay <= avgCycleLength) return 'luteal';
  
  // If we get here, wrap to next cycle
  const nextCycleDay = cycleDay % avgCycleLength || avgCycleLength; // If 0, use avgCycleLength
  if (nextCycleDay >= 1 && nextCycleDay <= avgPeriodLength) return 'period';
  if (nextCycleDay >= follicularStart && nextCycleDay <= follicularEnd) return 'follicular';
  if (nextCycleDay === ovulationDay) return 'ovulation';
  return 'luteal';
}

/**
 * Determines if a given date is within the fertile window
 * @param dateToCheck The date to check
 * @param lastPeriodStartDate The start date of the last period
 * @param avgCycleLength Average cycle length in days (default 28)
 * @param avgPeriodLength Average period length in days (default 5)
 * @returns Boolean indicating if the date is in the fertile window
 */
export function isInFertileWindow(
  dateToCheck: Date | string,
  lastPeriodStartDate: Date | string,
  avgCycleLength = 28,
  avgPeriodLength = 5
): boolean {
  // Fertile window is typically ~5 days before ovulation, day of ovulation, and 1 day after
  const phase = getCyclePhase(dateToCheck, lastPeriodStartDate, avgCycleLength, avgPeriodLength);
  
  if (phase === 'ovulation') return true;
  
  // Calculate ovulation day (typically 14 days before the end of cycle)
  const ovulationDay = Math.round(avgCycleLength - 14);
  
  // Fertile window starts 5 days before ovulation and ends 1 day after
  const fertileWindowStart = Math.max(ovulationDay - 5, avgPeriodLength + 1);  // Don't overlap with period
  const fertileWindowEnd = ovulationDay + 1;
  
  // Convert string dates to Date objects if needed
  const start = typeof lastPeriodStartDate === 'string' 
    ? parseISO(lastPeriodStartDate) 
    : new Date(lastPeriodStartDate);
    
  const checkDate = typeof dateToCheck === 'string' 
    ? parseISO(dateToCheck) 
    : new Date(dateToCheck);

  const diffInDays = differenceInDays(checkDate, start);
  
  if (diffInDays < 0) {
    // For dates before the last period, calculate the day in the previous cycle
    const daysBeforeCurrentCycle = Math.abs(diffInDays);
    const prevCycleDay = avgCycleLength - (daysBeforeCurrentCycle % avgCycleLength);
    
    // Check if it's in the fertile window of the previous cycle
    return prevCycleDay >= fertileWindowStart && prevCycleDay <= fertileWindowEnd;
  }
  
  // For dates after or on the last period start 
  const cycleDay = (diffInDays % avgCycleLength) + 1;
  
  // Check if in fertile window
  return cycleDay >= fertileWindowStart && cycleDay <= fertileWindowEnd;
}

/**
 * Gets the next expected period date based on average cycle length
 * @param lastPeriodStartDate The start date of the last period
 * @param avgCycleLength Average cycle length in days (default 28)
 * @returns Date of the next expected period
 */
export function getNextExpectedPeriodDate(
  lastPeriodStartDate: Date | string,
  avgCycleLength = 28
): Date {
  // Convert string date to Date object if needed
  const start = typeof lastPeriodStartDate === 'string'
    ? parseISO(lastPeriodStartDate)
    : new Date(lastPeriodStartDate);
    
  return addDays(start, avgCycleLength);
}

/**
 * Gets expected period days for a given cycle
 * @param periodStartDate The start date of the period
 * @param periodLength Length of period in days
 * @returns Array of dates that are expected to be in the period
 */
export function getExpectedPeriodDays(
  periodStartDate: Date | string,
  periodLength = 5
): Date[] {

// --- Data-driven prediction helpers ---

function computeCycleAverages(
  flowRecords: Array<{ date: string; intensity: string }>
): { avgCycleLength: number; avgPeriodLength: number; cyclesCount: number } {
  const nonSpotting = flowRecords.filter(r => r.intensity !== 'spotting');
  if (nonSpotting.length < 2) {
    return { avgCycleLength: 28, avgPeriodLength: 5, cyclesCount: 0 };
  }
  const sorted = [...nonSpotting].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  let periodStarts: Date[] = [parseISO(sorted[0].date)];
  let prevDate = parseISO(sorted[0].date);
  for (let i = 1; i < sorted.length; i++) {
    const currDate = parseISO(sorted[i].date);
    if (differenceInDays(currDate, prevDate) > 2) {
      periodStarts.push(currDate);
    }
    prevDate = currDate;
  }
  const cycleLengths = [];
  for (let i = 1; i < periodStarts.length; i++) {
    cycleLengths.push(differenceInDays(periodStarts[i], periodStarts[i - 1]));
  }
  const periodLengths = [];
  for (let i = 0; i < periodStarts.length; i++) {
    const start = periodStarts[i];
    let len = 1;
    for (let j = 1; i + j < sorted.length; j++) {
      const nextDate = parseISO(sorted[i + j].date);
      if (differenceInDays(nextDate, parseISO(sorted[i + j - 1].date)) === 1) {
        len++;
      } else {
        break;
      }
    }
    periodLengths.push(len);
  }
  const avgCycleLength = cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : 28;
  const avgPeriodLength = periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : 5;
  return {
    avgCycleLength,
    avgPeriodLength,
    cyclesCount: periodStarts.length
  };
}

function getBestCyclePredictionLengths(
  flowRecords: Array<{ date: string; intensity: string }>,
  userSettings?: { defaultCycleLength?: number; defaultPeriodLength?: number },
  minCyclesForAverage = 3
): { avgCycleLength: number; avgPeriodLength: number; used: 'logged' | 'user' | 'default' } {
  const { avgCycleLength, avgPeriodLength, cyclesCount } = computeCycleAverages(flowRecords);
  if (cyclesCount >= minCyclesForAverage) {
    return { avgCycleLength, avgPeriodLength, used: 'logged' };
  }
  if (userSettings?.defaultCycleLength || userSettings?.defaultPeriodLength) {
    return {
      avgCycleLength: userSettings?.defaultCycleLength || 28,
      avgPeriodLength: userSettings?.defaultPeriodLength || 5,
      used: 'user'
    };
  }
  return { avgCycleLength: 28, avgPeriodLength: 5, used: 'default' };
}

  // Convert string date to Date object if needed
  const start = typeof periodStartDate === 'string'
    ? parseISO(periodStartDate)
    : new Date(periodStartDate);
    
  const periodDays: Date[] = [];
  
  // Add all days of the period to the array
  for (let i = 0; i < periodLength; i++) {
    periodDays.push(addDays(start, i));
  }
  
  return periodDays;
}

// --- Data-driven prediction helpers ---

export function computeCycleAverages(
  flowRecords: Array<{ date: string; intensity: string }>
): { avgCycleLength: number; avgPeriodLength: number; cyclesCount: number } {
  const nonSpotting = flowRecords.filter(r => r.intensity !== 'spotting');
  if (nonSpotting.length < 2) {
    return { avgCycleLength: 28, avgPeriodLength: 5, cyclesCount: 0 };
  }
  const sorted = [...nonSpotting].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  let periodStarts: Date[] = [parseISO(sorted[0].date)];
  let prevDate = parseISO(sorted[0].date);
  for (let i = 1; i < sorted.length; i++) {
    const currDate = parseISO(sorted[i].date);
    if (differenceInDays(currDate, prevDate) > 2) {
      periodStarts.push(currDate);
    }
    prevDate = currDate;
  }
  const cycleLengths = [];
  for (let i = 1; i < periodStarts.length; i++) {
    cycleLengths.push(differenceInDays(periodStarts[i], periodStarts[i - 1]));
  }
  const periodLengths = [];
  for (let i = 0; i < periodStarts.length; i++) {
    const start = periodStarts[i];
    let len = 1;
    for (let j = 1; i + j < sorted.length; j++) {
      const nextDate = parseISO(sorted[i + j].date);
      if (differenceInDays(nextDate, parseISO(sorted[i + j - 1].date)) === 1) {
        len++;
      } else {
        break;
      }
    }
    periodLengths.push(len);
  }
  const avgCycleLength = cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : 28;
  const avgPeriodLength = periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : 5;
  return {
    avgCycleLength,
    avgPeriodLength,
    cyclesCount: periodStarts.length
  };
}

export function getBestCyclePredictionLengths(
  flowRecords: Array<{ date: string; intensity: string }>,
  userSettings?: { defaultCycleLength?: number; defaultPeriodLength?: number },
  minCyclesForAverage = 2
): { avgCycleLength: number; avgPeriodLength: number; used: 'logged' | 'user' | 'default' } {
  const { avgCycleLength, avgPeriodLength, cyclesCount } = computeCycleAverages(flowRecords);
  if (cyclesCount >= minCyclesForAverage) {
    return { avgCycleLength, avgPeriodLength, used: 'logged' };
  }
  if (cyclesCount === 1) {
    // Use first logged period length, but user/default cycle length
    return {
      avgCycleLength: userSettings?.defaultCycleLength || 28,
      avgPeriodLength,
      used: 'logged'
    };
  }
  if (userSettings?.defaultCycleLength) {
    return {
      avgCycleLength: userSettings.defaultCycleLength,
      avgPeriodLength: userSettings.defaultPeriodLength || 5,
      used: 'user'
    };
  }
  return { avgCycleLength: 28, avgPeriodLength: 5, used: 'default' };
}

/**
 * Returns which days should be auto-logged as "light" flow, and which should be removed if period ends early.
 *
 * @param periodStartDate Start date of the period (Date or string)
 * @param periodEndDate End date of the period (Date or string, optional)
 * @param periodLength Average/default period length
 * @param flowRecords Array of { date, intensity }
 * @returns { toLog: string[], toRemove: string[] }
 */
export function getAutoLogLightDays(
  periodStartDate: Date | string,
  periodEndDate: Date | string | undefined,
  periodLength: number,
  flowRecords: Array<{ date: string; intensity: string }>
): { toLog: string[]; toRemove: string[] } {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const start = typeof periodStartDate === 'string' ? parseISO(periodStartDate) : periodStartDate;
  // If endDate is provided, use the length between start and end (inclusive)
  let windowLength = periodLength;
  if (periodEndDate) {
    const end = typeof periodEndDate === 'string' ? parseISO(periodEndDate) : periodEndDate;
    windowLength = differenceInDays(end, start) + 1;
  }
  const expectedDays = [];
  for (let i = 0; i < windowLength; i++) {
    expectedDays.push(formatDate(addDays(start, i)));
  }
  // If periodEndDate is provided, adjust the window
  let endIdx = expectedDays.length;
  if (periodEndDate) {
    const end = typeof periodEndDate === 'string' ? parseISO(periodEndDate) : periodEndDate;
    // Include the end date in the window (find first day AFTER the end)
    endIdx = expectedDays.findIndex(d => isAfter(parseISO(d), end));
    if (endIdx === -1) endIdx = expectedDays.length;
  }
  const windowDays = expectedDays.slice(0, endIdx);
  // Find days in window not logged at all
  const loggedDays = new Set(flowRecords.map(r => r.date.split('T')[0]));
  const toLog = windowDays.filter(d => !loggedDays.has(d));
  // For early end, find auto-logged light days after endIdx
  let toRemove: string[] = [];
  if (periodEndDate && endIdx < expectedDays.length) {
    const afterEndDays = expectedDays.slice(endIdx);
    toRemove = afterEndDays.filter(d => {
      const rec = flowRecords.find(r => r.date.split('T')[0] === d);
      return rec && rec.intensity === 'light';
    });
  }
  return { toLog, toRemove };
}

/**
 * Returns which days should be deleted if a period ends early or is backlogged.
 * Deletes any non-spotting flow days between an END and the next START.
 *
 * @param periodEndDate End date of the period (Date or string)
 * @param nextPeriodStartDate Start date of the next period (Date or string, optional)
 * @param flowRecords Array of { date, intensity }
 * @returns string[] of dates to remove
 */
export function getDaysToRemoveBetweenPeriods(
  periodEndDate: Date | string,
  nextPeriodStartDate: Date | string | undefined,
  flowRecords: Array<{ date: string; intensity: string }>
): string[] {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const end = typeof periodEndDate === 'string' ? parseISO(periodEndDate) : periodEndDate;
  const endDay = endOfDay(end);  // Use end of day for comparison
  let nextStart: Date | undefined = undefined;
  if (nextPeriodStartDate) {
    nextStart = typeof nextPeriodStartDate === 'string' ? parseISO(nextPeriodStartDate) : nextPeriodStartDate;
  }
  // Defensive: sort flowRecords by date just in case
  const sortedRecords = [...flowRecords].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  return sortedRecords
    .filter(r => {
      const d = parseISO(r.date);
      if (r.intensity === 'spotting') return false;
      // Remove if it's after the end date (inclusive) and before next start
      if (isAfter(d, endDay) && (!nextStart || isBefore(d, nextStart))) return true;
      return false;
    })
    .map(r => r.date.split('T')[0]);
}