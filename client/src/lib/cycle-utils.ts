import { addDays, differenceInDays, parseISO } from 'date-fns';

/**
 * Determines the phase of menstrual cycle
 * @param dateToCheck The date to check the phase for
 * @param lastPeriodStartDate The start date of the last period
 * @param avgCycleLength Average cycle length in days (default 28)
 * @param avgPeriodLength Average period length in days (default 5)
 * @returns The phase name: 'Menstrual', 'Follicular', 'Ovulation', 'Luteal', or 'Unknown'
 */
export function getCyclePhase(
  dateToCheck: Date | string, 
  lastPeriodStartDate: Date | string, 
  avgCycleLength = 28,
  avgPeriodLength = 5
): 'period' | 'follicular' | 'ovulation' | 'luteal' | 'Unknown' {
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
  
  // If the date is before the last period start, it's in a previous cycle
  if (diffInDays < 0) {
    // For dates before the last period, we can still calculate the phase 
    // by working backwards from the cycle length
    // Calculate how many days before the current cycle
    const daysBeforeCurrentCycle = Math.abs(diffInDays);
    
    // Calculate which day in the previous cycle
    const prevCycleDay = avgCycleLength - (daysBeforeCurrentCycle % avgCycleLength);
    
    // Apply the same phase logic to the previous cycle
    if (prevCycleDay >= 1 && prevCycleDay <= avgPeriodLength) return 'period';
    if (prevCycleDay >= follicularStart && prevCycleDay <= follicularEnd) return 'follicular';
    if (prevCycleDay === ovulationDay) return 'ovulation';
    if (prevCycleDay > ovulationDay) return 'luteal';
  }
  
  // For dates after or on the last period start
  // Calculate cycle day (1-based)
  const cycleDay = (diffInDays % avgCycleLength) + 1;

  if (cycleDay >= 1 && cycleDay <= avgPeriodLength) return 'period';
  if (cycleDay >= follicularStart && cycleDay <= follicularEnd) return 'follicular';
  if (cycleDay === ovulationDay) return 'ovulation';
  if (cycleDay > ovulationDay && cycleDay <= avgCycleLength) return 'luteal';

  return 'Unknown'; // This should rarely happen now
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