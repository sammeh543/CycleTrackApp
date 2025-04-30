import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { parseISO, differenceInDays, format, subMonths } from 'date-fns';
import { useCycleData } from '@/hooks/use-cycle-data';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface CycleStatisticsProps {
  userId: number;
  cycles: Array<{
    id: number;
    startDate: string;
    endDate?: string;
  }>;
  flowRecords: Array<{
    date: string;
    intensity: string;
  }>;
  isStatsLoading?: boolean;
}

const CycleStatistics: React.FC<CycleStatisticsProps> = ({ userId, cycles, flowRecords, isStatsLoading }) => {
  const [cycleLengthData, setCycleLengthData] = useState<Array<{ month: string, days: number }>>([]);

  // Get user settings (for fallback)
  // UseCycleData hook is imported from '@/hooks/use-cycle-data'
  // This will provide userSettings, which contains defaultCycleLength and defaultPeriodLength
  const { userSettings } = useCycleData({ userId });

  // Fetch analytics data
  const {
    data: averageCycleLengthObj,
    isLoading: isAverageCycleLoading
  } = useQuery<{ averageCycleLength?: number } | undefined>({
    queryKey: [`/api/analytics/cycle-length/${userId}`],
    enabled: userId > 0,
    select: (data) => (data && typeof data === 'object' && 'averageCycleLength' in data ? data as { averageCycleLength?: number } : undefined),
  });

  const {
    data: averagePeriodLengthObj,
    isLoading: isAveragePeriodLoading
  } = useQuery<{ averagePeriodLength?: number } | undefined>({
    queryKey: [`/api/analytics/period-length/${userId}`],
    enabled: userId > 0,
    select: (data) => (data && typeof data === 'object' && 'averagePeriodLength' in data ? data as { averagePeriodLength?: number } : undefined),
  });

  // Extract the numbers for easier use
  const averageCycleLength = averageCycleLengthObj?.averageCycleLength;
  const averagePeriodLength = averagePeriodLengthObj?.averagePeriodLength;


  // Calculate tracked cycles count
  const trackedCycles = cycles.length;

  // Get last period start date
  const lastPeriodDate = cycles.length > 0
    ? format(parseISO(cycles[0].startDate), 'MMM d')
    : 'N/A';

  // Fallback logic for averages
  // For cycle length: must have at least 2 cycles to calculate an average
  let displayCycleLength: number = 28;
  if (cycles.length >= 2 && typeof averageCycleLength === 'number' && !isNaN(averageCycleLength)) {
    displayCycleLength = averageCycleLength;
  } else if (userSettings?.defaultCycleLength) {
    displayCycleLength = userSettings.defaultCycleLength;
  }

  // For period length: must have at least 1 cycle to calculate an average
  let displayPeriodLength: number = 5;
  if (cycles.length >= 1 && typeof averagePeriodLength === 'number' && !isNaN(averagePeriodLength)) {
    displayPeriodLength = averagePeriodLength;
  } else if (userSettings?.defaultPeriodLength) {
    displayPeriodLength = userSettings.defaultPeriodLength;
  }


  // Generate cycle length trend data
  useEffect(() => {
    if (cycles.length < 2) {
      // If not enough data, create some dummy placeholder data
      const data = [];
      const today = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        data.push({
          month: format(monthDate, 'MMM'),
          days: 0,
        });
      }
      
      setCycleLengthData(data);
      return;
    }

    // Sort cycles by start date (newest first)
    const sortedCycles = [...cycles].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    const data = [];
    const maxCycles = Math.min(sortedCycles.length - 1, 6); // Get up to 6 cycles

    for (let i = 0; i < maxCycles; i++) {
      const currentCycle = sortedCycles[i];
      const nextCycle = sortedCycles[i + 1];
      
      const currentStart = parseISO(currentCycle.startDate);
      const nextStart = parseISO(nextCycle.startDate);
      
      const cycleLength = differenceInDays(currentStart, nextStart);
      
      if (cycleLength > 0) {
        data.push({
          month: format(nextStart, 'MMM'),
          days: cycleLength,
        });
      }
    }

    // Reverse to show oldest to newest
    setCycleLengthData(data.reverse());
  }, [cycles]);

  if (isStatsLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Cycle Statistics</h3>
          <div className="flex justify-center items-center min-h-[80px]">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mr-3"></div>
            <span className="text-muted-foreground">Loading averages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-3">Cycle Statistics</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted bg-opacity-60 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Average Cycle</div>
            <div className="text-xl font-bold" style={{ color: 'rgb(99, 102, 241)' }}>
              {displayCycleLength || '-'} {displayCycleLength ? 'days' : ''}
            </div>
          </div>
          <div className="bg-muted bg-opacity-60 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Average Period</div>
            <div className="text-xl font-bold" style={{ color: 'rgb(99, 102, 241)' }}>
              {displayPeriodLength || '-'} {displayPeriodLength ? 'days' : ''}
            </div>
          </div>
          <div className="bg-muted bg-opacity-60 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Tracked Cycles</div>
            <div className="text-xl font-bold" style={{ color: 'rgb(99, 102, 241)' }}>
              {trackedCycles}
            </div>
          </div>
          <div className="bg-muted bg-opacity-60 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Last Period</div>
            <div className="text-xl font-bold" style={{ color: 'rgb(99, 102, 241)' }}>
              {lastPeriodDate}
            </div>
          </div>
        </div>
        
        {/* Cycle Length Chart */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Cycle Length Trend</h4>
          <div className="h-40 bg-muted bg-opacity-30 rounded-lg p-2">
            {cycleLengthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cycleLengthData}>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={true}
                    tickLine={false}
                    label={{ value: 'Month', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    hide={false}
                    domain={[0, 'dataMax + 5']}
                    tickLine={false}
                    axisLine={true}
                    width={38}
                    label={{ value: 'Days', angle: -90, position: 'insideLeft', offset: -2, fontSize: 12, fill: '#6B7280', fontWeight: 600, dy: 0 }}
                  />
                  <Bar 
                    dataKey="days" 
                    fill="rgb(49, 46, 129)"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    name="Cycle Length"
                    style={{ cursor: 'default' }}
                    onMouseOver={undefined}
                    onMouseOut={undefined}
                    activeBar={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Not enough data to show cycle trend
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CycleStatistics;
