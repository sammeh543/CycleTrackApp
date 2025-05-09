import React, { useState, useCallback } from 'react';
import { 
  format, 
  startOfMonth, 
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Heart } from 'lucide-react';
import CalendarGrid from '@/components/calendar/calendar-grid';
import IntimateIcon from '@/icons/IntimateIcon';
import UpcomingEvents from '@/components/calendar/upcoming-events';
import { useCycleData } from '@/hooks/use-cycle-data';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface UserSettings {
  id: number;
  userId: number;
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  // other fields omitted for brevity
}

interface CalendarProps {
  userId: number;
}

const Calendar: React.FC<CalendarProps> = ({ userId }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [, setLocation] = useLocation();
  
  const { 
    cycles, 
    flowRecords,
    predictNextPeriod,
    getAverageCycleLength,
    isLoading: cycleDataLoading
  } = useCycleData({ userId });
  
  // Fetch all symptom records for visualization
  const { data: symptomRecords, isLoading: symptomRecordsLoading } = useQuery({
    queryKey: ['/api/symptom-records', userId],
    queryFn: () => fetch(`/api/symptom-records?userId=${userId}`).then(res => res.json()),
    enabled: !!userId
  });
  
  // Fetch user settings
  const { data: userSettings, isLoading: userSettingsLoading } = useQuery<UserSettings>({
    queryKey: [`/api/user-settings/${userId}`],
    queryFn: () => fetch(`/api/user-settings/${userId}`).then(res => res.json()),
    enabled: !!userId
  });

  // Fetch sex records
  const { data: sexRecords, isLoading: sexRecordsLoading } = useQuery({
    queryKey: ['/api/sex-records', userId],
    queryFn: () => fetch(`/api/sex-records?userId=${userId}`).then(res => res.json()),
    enabled: !!userId
  });
  
  // Handle date selection to navigate to Today page with that date
  const handleDateSelect = useCallback((date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    setLocation(`/today?date=${formattedDate}`);
  }, [setLocation]);
  
  const isLoading = cycleDataLoading || symptomRecordsLoading || userSettingsLoading;
  
  // Navigation functions
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  // Calculate upcoming events
  const nextPeriod = predictNextPeriod();
  const daysUntilNextPeriod = nextPeriod ? 
    Math.ceil((nextPeriod.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  const avgCycleLength = getAverageCycleLength();
  const fertileWindowStart = nextPeriod ? 
    new Date(nextPeriod.getTime() - (18 * 24 * 60 * 60 * 1000)) : null;
  const daysUntilFertileWindow = fertileWindowStart ? 
    Math.ceil((fertileWindowStart.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  if (isLoading) {
    return (
      <div className="px-4 py-6 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading your calendar...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Calendar</h2>
        <Card>
          <CardContent className="p-4">
            {/* Month Selector */}
            <div className="flex justify-between items-center mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Previous month</span>
              </Button>
              <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Next month</span>
              </Button>
            </div>
            
            {/* Calendar */}
            <CalendarGrid 
              month={currentMonth}
              cycles={Array.isArray(cycles) ? cycles : []}
              flowRecords={Array.isArray(flowRecords) ? flowRecords : []}
              symptomRecords={Array.isArray(symptomRecords) ? symptomRecords : []}
              sexRecords={Array.isArray(sexRecords) ? sexRecords : []}
              userSettings={userSettings}
              onSelectDate={handleDateSelect}
            />
                        {/* Calendar Legend + Prediction Source Tooltip */}
            <div className="mt-5 flex flex-col items-center gap-2 px-2">
              <div className="flex flex-wrap justify-center gap-3 w-full">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-red-400/70 mr-2"></div>
                  <span className="text-xs font-medium">Menstrual</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-red-200/80 border-2 border-red-400 border-dashed mr-2"></div>
                  <span className="text-xs font-medium">Predicted Period</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-yellow-400/60 mr-2"></div>
                  <span className="text-xs font-medium">Follicular</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-400/70 mr-2"></div>
                  <span className="text-xs font-medium">Ovulation/Fertile</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-purple-400/60 mr-2"></div>
                  <span className="text-xs font-medium">Luteal</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300 mr-2 relative">
                    <div className="absolute w-2.5 h-2.5 bg-accent rounded-full bottom-[-2px] right-[-2px]"></div>
                  </div>
                  <span className="text-xs font-medium">Symptoms</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300 mr-2 relative">
                    <div className="absolute w-2.5 h-2.5 bg-gray-400 rounded-full bottom-[-2px] right-[-2px]"></div>
                  </div>
                  <span className="text-xs font-medium">Spotting</span>
                </div>
                <div className="flex items-center">
                  <IntimateIcon className="w-5 h-5 text-pink-500 dark:text-pink-400 mr-2" />
                  <span className="text-xs font-medium">Intimate Activity</span>
                </div>
              </div>
              {/* Prediction Source Tooltip */}
              <div className="calendar-prediction-tooltip text-xs mt-2 text-center">
                {(() => {
                  if (cycles && cycles.length >= 2 && avgCycleLength) {
                    return (
                      <span>Predictions are based on your logged data averages.</span>
                    );
                  } else if (userSettings?.defaultCycleLength && userSettings?.defaultPeriodLength) {
                    return (
                      <span>Predictions use your custom defaults.</span>
                    );
                  } else {
                    return (
                      <span>Predictions use standard defaults (28-day cycle, 5-day period).</span>
                    );
                  }
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Upcoming Section */}
        <div className="mt-6">
          <UpcomingEvents 
            nextPeriodDate={nextPeriod}
            daysUntilNextPeriod={daysUntilNextPeriod}
            fertileWindowStart={fertileWindowStart}
            daysUntilFertileWindow={daysUntilFertileWindow}
            userSettings={userSettings}
          />
        </div>
      </div>
      {/* Disclaimer - Card for visual consistency and theming */}
      <Card className="mt-8 mb-4 mx-auto max-w-2xl border border-primary border-l-4 bg-period-expected">
        <CardContent className="py-3 px-4 text-center">
          <span className="text-xs font-medium block">
            <strong>Disclaimer:</strong> {(() => {
              if (cycles && cycles.length >= 2 && avgCycleLength) {
                return (
                  <>Predictions are based on your logged data averages. </>
                );
              } else if (userSettings?.defaultCycleLength && userSettings?.defaultPeriodLength) {
                return (
                  <>Predictions use your custom defaults. </>
                );
              } else {
                return (
                  <>Predictions use standard defaults (28-day cycle, 5-day period). </>
                );
              }
            })()}
            Cycle and fertile window predictions are estimates only and may not be accurate. Do not rely on this data for medical or contraceptive decisions. Always consult a healthcare professional for guidance.
          </span>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
