import React from 'react';
import IntimateIcon from '@/icons/IntimateIcon';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isWithinInterval,
  format,
  addDays,
  isBefore,
  differenceInDays
} from 'date-fns';
import { getCyclePhase, isInFertileWindow, getNextExpectedPeriodDate, getExpectedPeriodDays, getBestCyclePredictionLengths } from '@/lib/cycle-utils';
import { getDataDrivenCyclePhase } from '@/lib/data-driven-cycle-phase';

interface CalendarGridProps {
  month: Date;
  cycles: Array<{
    id: number;
    startDate: string;
    endDate?: string;
  }>;
  flowRecords: Array<{
    date: string;
    intensity: string;
  }>;
  symptomRecords?: Array<{
    date: string;
    symptomId: number;
  }>;
  sexRecords?: Array<{
    date: string;
    // other fields if needed
  }>;
  userSettings?: {
    defaultCycleLength?: number;
    defaultPeriodLength?: number;
    showIntimateActivity?: boolean;
  };
  onSelectDate?: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  month, 
  cycles, 
  flowRecords, 
  symptomRecords = [], 
  sexRecords = [],
  userSettings = {},
  onSelectDate 
}) => {
  // Get all dates for the calendar view
  const calendarStart = startOfWeek(startOfMonth(month));

  // Helper to check if a date has a sex record
  const hasSexRecord = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return sexRecords.some(record => {
      // Always use parseISO for record.date to avoid timezone bugs
      const recordDate = typeof record.date === 'string' ? parseISO(record.date) : record.date;
      return format(recordDate, 'yyyy-MM-dd') === dateKey;
    });
  };
  const calendarEnd = endOfWeek(endOfMonth(month));
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Handle click on a date
  const handleDateClick = (date: Date) => {
    if (onSelectDate) {
      onSelectDate(date);
    }
  };
  
  // Determine period days, fertile window, and symptoms for each date
  // Use best available cycle/period length for predictions
  const { avgCycleLength, avgPeriodLength } = getBestCyclePredictionLengths(flowRecords, userSettings);
  // Find the latest logged period (non-spotting flow records)
  const nonSpotting = flowRecords.filter(r => r.intensity !== 'spotting').sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  let lastPeriodStart: Date | null = null;
  let lastPeriodEnd: Date | null = null;
  let isOngoingPeriod = false;
  if (nonSpotting.length > 0) {
    // Period clusters: gap > 2 days
    let clusters: Date[][] = [];
    let currentCluster: Date[] = [parseISO(nonSpotting[0].date)];
    for (let i = 1; i < nonSpotting.length; i++) {
      const prev = parseISO(nonSpotting[i-1].date);
      const curr = parseISO(nonSpotting[i].date);
      if (differenceInDays(curr, prev) > 2) {
        clusters.push(currentCluster);
        currentCluster = [curr];
      } else {
        currentCluster.push(curr);
      }
    }
    clusters.push(currentCluster);
    // Last cluster is latest period
    const lastCluster = clusters[clusters.length - 1];
    lastPeriodStart = lastCluster[0];
    lastPeriodEnd = lastCluster[lastCluster.length - 1];
    // If last period is not ended (no endDate in cycles, or last logged day is recent), treat as ongoing
    const latestCycle = cycles && cycles.length > 0 ? cycles[cycles.length - 1] : null;
    if (latestCycle && latestCycle.startDate && !latestCycle.endDate) {
      isOngoingPeriod = true;
    }
  }

  // Calculate next predicted period start (after last period)
  let nextPredictedPeriodStart: Date | null = null;
  if (lastPeriodStart) {
    // Calculate from last period start
    nextPredictedPeriodStart = addDays(lastPeriodStart, avgCycleLength);
    // If we have a period end and the predicted start would overlap, adjust
    if (lastPeriodEnd && nextPredictedPeriodStart <= lastPeriodEnd) {
      nextPredictedPeriodStart = addDays(lastPeriodEnd, avgCycleLength - differenceInDays(lastPeriodEnd, lastPeriodStart));
    }
  }

  // No autofill - only use actual logged periods
  // This simplifies the logic and avoids confusion
  const fillOngoingPeriodDates: string[] = [];

  // --- Robust, Today-matching prediction logic ---
  // 1. Build a sorted list of all non-spotting period starts
  const sortedPeriodRecords = [...nonSpotting].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  const periodStarts: Date[] = [];
  for (let i = 0; i < sortedPeriodRecords.length; i++) {
    if (i === 0 || differenceInDays(parseISO(sortedPeriodRecords[i].date), parseISO(sortedPeriodRecords[i-1].date)) > 2) {
      periodStarts.push(parseISO(sortedPeriodRecords[i].date));
    }
  }

  // 2. Predict future periods using the last logged period start and the correct average/user-set cycle/period length
  const predictedPeriodDates: string[] = [];
  if (periodStarts.length > 0) {
    const lastLoggedStart = periodStarts[periodStarts.length - 1];
    let nextStart = addDays(lastLoggedStart, avgCycleLength);
    // If last logged period end exists and nextStart would overlap, adjust
    if (lastPeriodEnd && nextStart <= lastPeriodEnd) {
      nextStart = addDays(lastPeriodEnd, avgCycleLength - differenceInDays(lastPeriodEnd, lastLoggedStart));
    }
    for (let i = 0; i < 3; i++) {
      const periodStart = i === 0 ? nextStart : addDays(nextStart, i * avgCycleLength);
      // END IS periodStart + avgPeriodLength (inclusive)
      eachDayOfInterval({
        start: periodStart,
        end: addDays(periodStart, avgPeriodLength - 1)
      }).forEach(d => {
        predictedPeriodDates.push(format(d, 'yyyy-MM-dd'));
      });
    }
  }

  // Helper to build period clusters (actual and predicted)
  function buildPeriodClusters(periodStarts: Date[], predictedPeriodDates: string[], avgPeriodLength: number) {
    // Actual period clusters
    let clusters: { start: Date, end: Date, predicted: boolean }[] = [];
    let sortedStarts = [...periodStarts].sort((a, b) => a.getTime() - b.getTime());
    for (let i = 0; i < sortedStarts.length; i++) {
      let start = sortedStarts[i];
      let end = start;
      // Expand cluster to consecutive period days
      while (i + 1 < sortedStarts.length && differenceInDays(sortedStarts[i + 1], end) === 1) {
        end = sortedStarts[i + 1];
        i++;
      }
      clusters.push({ start, end, predicted: false });
    }
    // Predicted period clusters
    let usedPredicted = new Set();
    for (let i = 0; i < predictedPeriodDates.length; i++) {
      if (usedPredicted.has(predictedPeriodDates[i])) continue;
      let start = parseISO(predictedPeriodDates[i]);
      let end = start;
      for (let j = 1; j < avgPeriodLength; j++) {
        let next = format(addDays(start, j), 'yyyy-MM-dd');
        if (predictedPeriodDates.includes(next)) {
          end = addDays(start, j);
          usedPredicted.add(next);
        } else {
          break;
        }
      }
      clusters.push({ start, end, predicted: true });
      usedPredicted.add(format(start, 'yyyy-MM-dd'));
    }
    // Sort all clusters by start
    return clusters.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  // Unified day status calculation that matches Today page logic
  const getDayStatus = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // 1. Determine if this is an actual logged period day (non-spotting)
    const isActualPeriod = flowRecords.some(r =>
      format(parseISO(r.date), 'yyyy-MM-dd') === dateKey &&
      r.intensity !== 'spotting'
    );
    
    // 2. Determine if this is a predicted period day
    const isPredictedPeriod = !isActualPeriod && predictedPeriodDates.includes(dateKey);
    
    // 3. Find the most recent period cluster ending before this date (Today tab logic)
    let lastClusterEnd: Date | undefined = undefined;
    if (nonSpotting.length > 0) {
      // Group period days into clusters (gap > 2 days)
      let clusters: Date[][] = [];
      let currentCluster: Date[] = [parseISO(nonSpotting[0].date)];
      for (let i = 1; i < nonSpotting.length; i++) {
        const prev = parseISO(nonSpotting[i-1].date);
        const curr = parseISO(nonSpotting[i].date);
        if (differenceInDays(curr, prev) > 2) {
          clusters.push(currentCluster);
          currentCluster = [curr];
        } else {
          currentCluster.push(curr);
        }
      }
      clusters.push(currentCluster);
      // Find the latest cluster ending before this date
      const lastCluster = clusters.filter(cluster => cluster[cluster.length-1] < date).slice(-1)[0];
      if (lastCluster) {
        lastClusterEnd = lastCluster[lastCluster.length-1];
      }
    }
    
    // 4. Calculate phase using the same anchor logic as Today tab
    let phase: string;
    if (isActualPeriod || isPredictedPeriod) {
      phase = 'period';
    } else {
      // Sort period records by date descending (newest first)
      const sortedPeriodRecords = [...nonSpotting].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      // Find most recent period start before or on this date
      const lastPeriodRecord = sortedPeriodRecords.find(r => parseISO(r.date) <= date);
      if (lastPeriodRecord) {
        // Use the last period start as anchor
        phase = getDataDrivenCyclePhase(date, flowRecords, userSettings, predictedPeriodDates);
      } else {
        phase = 'follicular';
      }
    }
    
    // 5. Determine fertile window (using same logic as Today page)
    const sortedPeriodRecordsForFertile = [...nonSpotting].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    const lastPeriodRecordForFertile = sortedPeriodRecordsForFertile.find(r => parseISO(r.date) <= date);
    const isFertile = lastPeriodRecordForFertile && 
      isInFertileWindow(date, parseISO(lastPeriodRecordForFertile.date), avgCycleLength, avgPeriodLength) && 
      phase !== 'period';
    
    // 6. Check for symptoms and spotting
    const hasSymptoms = symptomRecords.some(r => isSameDay(date, parseISO(r.date)));
    const isSpotting = flowRecords.some(r => 
      format(parseISO(r.date), 'yyyy-MM-dd') === dateKey &&
      r.intensity === 'spotting'
    );
    
    return {
      isPeriod: isActualPeriod,
      isPredictedPeriod,
      isFertile,
      isSymptom: hasSymptoms,
      isSpotting,
      phase
    };
  };



  
  return (
    <div>
      {/* Days of Week */}
      <div className="grid grid-cols-7 text-center mb-2">
        <div className="text-xs font-medium text-muted-foreground">S</div>
        <div className="text-xs font-medium text-muted-foreground">M</div>
        <div className="text-xs font-medium text-muted-foreground">T</div>
        <div className="text-xs font-medium text-muted-foreground">W</div>
        <div className="text-xs font-medium text-muted-foreground">T</div>
        <div className="text-xs font-medium text-muted-foreground">F</div>
        <div className="text-xs font-medium text-muted-foreground">S</div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, month);
          const isCurrentDay = isSameDay(day, new Date());
          const { isPeriod, isPredictedPeriod, isFertile, isSymptom, isSpotting, phase } = getDayStatus(day);
          
          let classNames = "calendar-day";
          let phaseColor = "";
          let borderStyle = "";
          
          if (!isCurrentMonth) {
            classNames += " empty";
          }
          
          // Determine the phase color
          if (isPeriod) {
            phaseColor = "bg-red-400/70";
          } else if (isPredictedPeriod) {
            phaseColor = "bg-red-200/80"; // Soft coral/pink shade
            borderStyle = "border-2 border-red-400 border-dashed"; // Dotted red border
          } else if (isFertile) {
            phaseColor = "bg-blue-400/70";
          } else if (phase === 'ovulation') {
            phaseColor = "bg-teal-600/80"; // Deep teal color
          } else if (phase === 'follicular') {
            phaseColor = "bg-yellow-400/60";
          } else if (phase === 'luteal') {
            phaseColor = "bg-purple-400/60";
          }
          
          if (isCurrentDay) {
            classNames += " today";
          } else {
            // Allow multiple conditions to be applied
            if (isPeriod) classNames += " period";
            if (isPredictedPeriod) classNames += " predicted-period"; 
            if (isFertile && !isPeriod && !isPredictedPeriod) classNames += " fertile";
            if (isSymptom) classNames += " symptoms";
            if (isSpotting) classNames += " spotting";
          }
          
          return (
            <div 
              key={index} 
              className={`${classNames} ${isCurrentMonth && phaseColor ? phaseColor : ''} ${borderStyle}`}
              onClick={() => isCurrentMonth && handleDateClick(day)}
            >
              <span className={`date-number ${isCurrentMonth ? 'text-foreground' : 'text-gray-500'} ${(isPeriod || (isFertile && !isPredictedPeriod) || isCurrentDay) ? 'text-white font-semibold' : ''} ${isPredictedPeriod ? 'text-red-600 font-semibold' : ''}`}>
                {format(day, 'd')}
              </span>
              {isSymptom && <span className="symptom-indicator"></span>}
              {isSpotting && <span className="spotting-indicator"></span>}
              {/* Intimate activity indicator */}
              {userSettings.showIntimateActivity !== false && hasSexRecord(day) && (
                <span className="intimate-indicator flex items-center justify-center mt-0.5">
                  {/* Use themeable color for sex indicator */}
                  <IntimateIcon className="w-4 h-4 text-accent" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
