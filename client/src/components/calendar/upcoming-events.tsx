import React from 'react';
import { format, addDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Heart, CalendarCheck } from 'lucide-react';

interface UpcomingEventsProps {
  nextPeriodDate: Date | null;
  daysUntilNextPeriod: number | null;
  fertileWindowStart: Date | null;
  daysUntilFertileWindow: number | null;
  userSettings?: {
    defaultCycleLength?: number;
    defaultPeriodLength?: number;
  };
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
  nextPeriodDate,
  daysUntilNextPeriod,
  fertileWindowStart,
  daysUntilFertileWindow,
  userSettings
}) => {
  // If we have no data and no user settings, show the "not enough data" message
  if (!nextPeriodDate && !fertileWindowStart && !userSettings?.defaultCycleLength) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Upcoming</h3>
          <p className="text-sm text-muted-foreground">
            Not enough data to predict upcoming events.
            Continue tracking your cycle for personalized predictions.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // If we have no period prediction but we have user settings, show a prediction based on settings
  if (!nextPeriodDate && userSettings?.defaultCycleLength) {
    // Create a prediction based on default settings
    const today = new Date();
    const predictedNextPeriod = addDays(today, 14); // Just an example starting point
    const cycleDays = userSettings.defaultCycleLength || 28;
    const periodDays = userSettings.defaultPeriodLength || 5;
    
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Upcoming</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-primary bg-opacity-10 rounded-lg border-l-4 border-primary">
              <CalendarCheck className="text-primary mr-3 h-5 w-5" />
              <div>
                <div className="font-medium">Estimated next period</div>
                <div className="text-sm text-foreground">
                  Based on your settings ({cycleDays}-day cycle)
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Add flow data to improve predictions
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">Upcoming</h3>
        <div className="space-y-3">
          {nextPeriodDate && daysUntilNextPeriod !== null && (
            <div className="flex items-center p-3 bg-primary bg-opacity-10 rounded-lg border-l-4 border-primary">
              <Calendar className="text-primary mr-3 h-5 w-5" />
              <div>
                <div className="font-medium">Period expected</div>
                <div className="text-sm text-foreground">
                  {daysUntilNextPeriod <= 0 
                    ? 'Starting today' 
                    : `In ${daysUntilNextPeriod} ${daysUntilNextPeriod === 1 ? 'day' : 'days'}`} 
                  • {format(nextPeriodDate, 'MMM d')}
                </div>
                {userSettings?.defaultPeriodLength && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Expected duration: {userSettings.defaultPeriodLength} days 
                    (until {format(addDays(nextPeriodDate, userSettings.defaultPeriodLength - 1), 'MMM d')})
                  </div>
                )}
              </div>
            </div>
          )}
          
          {fertileWindowStart && daysUntilFertileWindow !== null && daysUntilFertileWindow > 0 && (
            <div className="flex items-center p-3 bg-secondary bg-opacity-10 rounded-lg border-l-4 border-secondary fertile-window-box">
              <Heart className="text-secondary mr-3 h-5 w-5" />
              <div>
                <div className="font-medium">Fertile window starts</div>
                <div className="text-sm text-foreground">
                  In {daysUntilFertileWindow} {daysUntilFertileWindow === 1 ? 'day' : 'days'} 
                  • {format(fertileWindowStart, 'MMM d')}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingEvents;
