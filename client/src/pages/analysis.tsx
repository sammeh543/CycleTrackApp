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
    isLoading: isCycleDataLoading
  } = useCycleData({ userId });

  // States for hidden symptoms and their loading status
  const [hiddenDefaultSymptoms, setHiddenDefaultSymptoms] = React.useState<number[]>([]);
  const [hiddenCustomSymptoms, setHiddenCustomSymptoms] = React.useState<number[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = React.useState(true);  // Track settings loading state

  // States to hold default cycles and symptoms before actual data arrives
  const [loadedCycles, setLoadedCycles] = React.useState<boolean>(false);
  const [loadedSymptoms, setLoadedSymptoms] = React.useState<boolean>(false);

  // Fetch user settings for hidden symptoms
  React.useEffect(() => {
    fetch(`/api/user-settings/${userId}`)
      .then(res => res.json())
      .then(settings => {
        if (settings?.hiddenSymptoms) {
          try {
            const hiddenDefaults = JSON.parse(settings.hiddenSymptoms);
            if (Array.isArray(hiddenDefaults)) setHiddenDefaultSymptoms(hiddenDefaults);
          } catch {}
        }
        if (settings?.hiddenCustomSymptoms) {
          try {
            const hiddenCustoms = JSON.parse(settings.hiddenCustomSymptoms);
            if (Array.isArray(hiddenCustoms)) setHiddenCustomSymptoms(hiddenCustoms);
          } catch {}
        }
        setIsSettingsLoading(false);  // Mark settings as loaded
      })
      .catch(() => setIsSettingsLoading(false));  // Mark settings as loaded on error
  }, [userId]);

  // Wait for cycles and symptoms to load before displaying them
  React.useEffect(() => {
    if (Array.isArray(cycles)) setLoadedCycles(true);
    if (Array.isArray(symptoms)) setLoadedSymptoms(true);
  }, [cycles, symptoms]);

  // Only show symptoms that are not hidden
  const visibleSymptoms = React.useMemo(() => {
    if (!Array.isArray(symptoms)) return [];
    return symptoms.filter(symptom => {
      if (symptom.isDefault) {
        return !hiddenDefaultSymptoms.includes(symptom.id);
      } else {
        return !hiddenCustomSymptoms.includes(symptom.id);
      }
    });
  }, [symptoms, hiddenDefaultSymptoms, hiddenCustomSymptoms]);

    // No longer show a global spinner here. Let CycleStatistics handle its own spinner via the isStatsLoading prop.
  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Analysis</h2>

        {/* Cycle Statistics */}
        <CycleStatistics 
          userId={userId} 
          cycles={cycles || []} 
          flowRecords={flowRecords || []}
          isStatsLoading={isCycleDataLoading || isSettingsLoading || !loadedCycles || !loadedSymptoms}
        />
        
        {/* Time Series Charts - New! */}
        <TimeSeriesCharts 
          userId={userId}
          symptomRecords={Array.isArray(symptomRecords) ? symptomRecords : []}
          moodRecords={Array.isArray(moodRecords) ? moodRecords : []}
          cervicalMucusRecords={Array.isArray(cervicalMucusRecords) ? cervicalMucusRecords : []}
          symptoms={visibleSymptoms}
          flowRecords={Array.isArray(flowRecords) ? flowRecords : []}
          cycles={Array.isArray(cycles) ? cycles : []}
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
