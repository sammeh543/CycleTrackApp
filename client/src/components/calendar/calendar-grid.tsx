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
import { getCyclePhase, isInFertileWindow, getNextExpectedPeriodDate, getExpectedPeriodDays } from '@/lib/cycle-utils';

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
  const getDayStatus = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Check if this date has a flow record
    const flowRecord = flowRecords.find(r => format(new Date(r.date), 'yyyy-MM-dd') === dateKey);
    const hasFlowRecord = !!flowRecord;
    const isSpotting = flowRecord?.intensity === 'spotting';
    
    // Group flow records by month to find period clusters
    const periodStartDates: Date[] = [];
    const periodEndDates = new Map<string, Date>();
    
    // Sort flow records by date (excluding spotting)
    const sortedFlowRecords = [...flowRecords]
      .filter(record => record.intensity !== 'spotting') // Exclude spotting
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Find period start dates and end dates
    if (sortedFlowRecords.length > 0) {
      let currentPeriodStart = new Date(sortedFlowRecords[0].date);
      let currentPeriodEnd = currentPeriodStart;
      periodStartDates.push(currentPeriodStart);
      
      for (let i = 1; i < sortedFlowRecords.length; i++) {
        const currentDate = new Date(sortedFlowRecords[i].date);
        const prevDate = new Date(sortedFlowRecords[i-1].date);
        
        // If this flow record is more than 2 days after the previous one,
        // consider it the start of a new period
        if (differenceInDays(currentDate, prevDate) > 2) {
          // End the previous period
          periodEndDates.set(format(currentPeriodStart, 'yyyy-MM-dd'), currentPeriodEnd);
          
          // Start a new period
          currentPeriodStart = currentDate;
          periodStartDates.push(currentPeriodStart);
        }
        
        // Update the end date of the current period
        currentPeriodEnd = currentDate;
      }
      
      // Set the end date for the last period
      periodEndDates.set(format(currentPeriodStart, 'yyyy-MM-dd'), currentPeriodEnd);
    }
    
    // Find the most recent period start date for this date
    const lastPeriodStartDate = periodStartDates
      .filter(d => d <= date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    let isFertileDay = false;
    let isPeriodDay = hasFlowRecord && !isSpotting; // Only non-spotting flow records are period days
    let isPredictedPeriod = false;
    let cyclePhase = 'unknown';
    
    // Get cycle length and period length from user settings or use defaults
    const avgCycleLength = userSettings?.defaultCycleLength || 28;
    const avgPeriodLength = userSettings?.defaultPeriodLength || 5;
    
    if (lastPeriodStartDate) {
      // Check if this date is within an actual period (based on flow records)
      const periodStartKey = format(lastPeriodStartDate, 'yyyy-MM-dd');
      const periodEndDate = periodEndDates.get(periodStartKey);
      
      // IMPORTANT: First check if we have actual flow records to determine period days
      if (periodEndDate && date <= periodEndDate && date >= lastPeriodStartDate) {
        if (!isSpotting) {
          isPeriodDay = true;
          cyclePhase = 'period';
        } else {
          // For spotting within period dates, use the calculated phase but don't mark as period day
          cyclePhase = getCyclePhase(date, lastPeriodStartDate, avgCycleLength, avgPeriodLength);
        }
      } else if (hasFlowRecord && !isSpotting) {
        // If there's a non-spotting flow record but it's not part of a recognized period cluster
        isPeriodDay = true;
        cyclePhase = 'period';
      } else {
        // If no flow records or only spotting, use the cycle phase calculation
        cyclePhase = getCyclePhase(date, lastPeriodStartDate, avgCycleLength, avgPeriodLength);
        
        // For dates in the past, we can fill in missing period days based on the calculated phase
        // Only fill in missing days if they're within avgPeriodLength days of the period start
        const daysSincePeriodStart = differenceInDays(date, lastPeriodStartDate);
        if (cyclePhase === 'period' && !hasFlowRecord && 
            daysSincePeriodStart >= 0 && daysSincePeriodStart < avgPeriodLength && 
            date <= new Date()) {
          isPredictedPeriod = true;
        }
      }
      
      // Calculate next expected period date
      const nextPeriodDate = getNextExpectedPeriodDate(lastPeriodStartDate, avgCycleLength);
      
      // Get all expected period days based on period length setting
      const expectedPeriodDays = getExpectedPeriodDays(nextPeriodDate, avgPeriodLength);
      
      // Check if this date is in the expected period days
      if (expectedPeriodDays.some(periodDay => isSameDay(date, periodDay))) {
        isPredictedPeriod = true;
        
        // If the predicted day also happens to be in a period phase according to 
        // the cycle phase calculation, we've already marked it above
        if (cyclePhase !== 'period') {
          cyclePhase = 'period'; // Override the phase for predicted period days
        }
      }
      
      // Check if in fertile window
      isFertileDay = isInFertileWindow(date, lastPeriodStartDate, avgCycleLength, avgPeriodLength) && 
        !isPeriodDay && !isPredictedPeriod;
    }
    
    // Check for actual symptom records for this date
    const hasSymptoms = symptomRecords.some(record => {
      const recordDate = parseISO(record.date);
      return isSameDay(date, recordDate);
    });
    
    return {
      isPeriod: isPeriodDay,
      isPredictedPeriod,
      isFertile: isFertileDay,
      isSymptom: hasSymptoms,
      isSpotting,
      phase: cyclePhase
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
          if (phase === 'period' || isPeriod || isPredictedPeriod) {
            phaseColor = "bg-red-400/70";
            
            // For predicted periods, use a soft coral/pink shade with dotted outline
            if (isPredictedPeriod) {
              phaseColor = "bg-red-200/80"; // Soft coral/pink shade
              borderStyle = "border-2 border-red-400 border-dashed"; // Dotted red border
            }
          } else if (phase === 'follicular') {
            phaseColor = "bg-yellow-400/60";
          } else if (phase === 'ovulation' || isFertile) {
            phaseColor = "bg-blue-400/70";
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
