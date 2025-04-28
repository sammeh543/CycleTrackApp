import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, LineChart as LineChartIcon } from 'lucide-react';
import { useCycleData } from '@/hooks/use-cycle-data';

interface SymptomChartsProps {
  userId: number;
}

const SymptomCharts: React.FC<SymptomChartsProps> = ({ userId }) => {
  // State for time period selection
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | '6months' | 'year' | 'all'>('month');
  
  // Get user settings and cycle data
  const { 
    userSettings
  } = useCycleData({ userId });
  
  // Default cycle lengths from user settings or use standard defaults
  const cycleLength = userSettings?.defaultCycleLength || 28;
  const periodLength = userSettings?.defaultPeriodLength || 5;

  // Fetch top symptoms with time period
  const { data: topSymptoms } = useQuery({
    queryKey: [`/api/analytics/top-symptoms/${userId}`, timePeriod],
    queryFn: () => {
      return fetch(`/api/analytics/top-symptoms/${userId}?limit=5${timePeriod !== 'all' ? `&period=${timePeriod}` : ''}`).then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch top symptoms');
        }
        return res.json();
      });
    },
    enabled: userId > 0
  });

  return (
    <Card className="mb-6 bg-background">
      <CardHeader className="pb-0 pt-4 px-4 flex flex-row items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Symptom Analysis</h3>
        <div className="w-40">
          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as any)} className="bg-background text-foreground">
            <SelectTrigger>
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 fill-primary" />
                  <span className="text-foreground">Week</span>
                </div>
              </SelectItem>
              <SelectItem value="month">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 fill-primary" />
                  <span className="text-foreground">Month</span>
                </div>
              </SelectItem>
              <SelectItem value="6months">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 fill-primary" />
                  <span className="text-foreground">6 Months</span>
                </div>
              </SelectItem>
              <SelectItem value="year">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 fill-primary" />
                  <span className="text-foreground">Year</span>
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex items-center">
                  <LineChartIcon className="mr-2 h-4 w-4 fill-accent" />
                  <span className="text-accent">All Time</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-6">
          {/* Top Symptoms */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2 text-foreground">Top Recurring Symptoms</h4>
            <div className="space-y-2">
              {topSymptoms && topSymptoms.length > 0 ? (
                topSymptoms.map((symptom: { symptomId: number, name: string, count: number }, index: number) => (
                  <div key={symptom.symptomId} className="flex items-baseline justify-between">
                    <span className="text-sm whitespace-nowrap align-baseline text-foreground">{symptom.name}</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-gray-400" style={{ borderBottomWidth: 2, minWidth: 12, position: 'relative', top: '0.4em' }}></span>
                    <span className="text-xs font-semibold align-baseline" style={{ color: 'var(--accent)' }}>{symptom.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not enough data to show top symptoms
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SymptomCharts;
