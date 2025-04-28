import React from 'react';
import { Card } from '@/components/ui/card';
import CycleStatistics from '@/components/analysis/cycle-statistics';
import TimeSeriesCharts from '@/components/analysis/time-series-charts';
import { useCycleData } from '@/hooks/use-cycle-data';

interface AnalysisProps {
  userId: number;
}

const Analysis: React.FC<AnalysisProps> = ({ userId }) => {
  const { 
    cycles,
    flowRecords,
    symptomRecords,
    moodRecords,
    cervicalMucusRecords,
    symptoms,
    getAverageCycleLength,
    isLoading
  } = useCycleData({ userId });

  if (isLoading) {
    return (
      <div className="px-4 py-6 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading your analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Analysis</h2>

        {/* Cycle Statistics */}
        <CycleStatistics 
          userId={userId} 
          cycles={cycles || []} 
          flowRecords={flowRecords || []}
        />
        
        {/* Time Series Charts - New! */}
        <TimeSeriesCharts 
          userId={userId}
          symptomRecords={symptomRecords || []}
          moodRecords={moodRecords || []}
          cervicalMucusRecords={cervicalMucusRecords || []}
          symptoms={symptoms || []}
          flowRecords={flowRecords || []}
          cycles={cycles || []}
        />
        
        {/* Placeholder for new analysis content (e.g., summary stats, insights, or new visualization) */}
        {/* TODO: Add new content here to replace removed correlation charts */}

        {/* Export Data - removed as export is now in settings */}
        {/* <ExportData userId={userId} /> */}
      </div>
    </div>
  );
};

export default Analysis;
