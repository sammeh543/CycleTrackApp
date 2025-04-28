import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, subDays, isAfter } from 'date-fns';
import { useCycleData } from '@/hooks/use-cycle-data';
import { getCyclePhase } from '@/lib/cycle-utils';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription
} from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TimeSeriesChartsProps {
  userId: number;
  symptomRecords: Array<{
    id: number;
    date: string;
    userId: number;
    symptomId: number;
    intensity: number | null;
  }>;
  moodRecords: Array<{
    id: number;
    date: string;
    userId: number;
    mood: string;
  }>;
  cervicalMucusRecords?: Array<{
    id: number;
    date: string;
    userId: number;
    type: string;
  }>;
  symptoms: Array<{
    id: number;
    name: string;
    category: string;
  }>;
  flowRecords: Array<{
    date: string;
    intensity: string;
  }>;
  cycles: Array<{
    id: number;
    startDate: string;
    endDate?: string;
  }>;
}

// Map mood strings to numeric values (updated to match Today page)
const moodToIntensity: Record<string, number> = {
  "awful": 0,
  "bad": 1,
  "okay": 2,
  "good": 3,
  "great": 4
};

// Cervical mucus types with numeric values for charting
const mucusTypeToIntensity: Record<string, number> = {
  "dry": 0,
  "sticky": 1,
  "creamy": 2, 
  "watery": 3,
  "eggWhite": 4
};

// Friendly display names for mucus types
const mucusTypeNames: Record<string, string> = {
  "dry": "Dry",
  "sticky": "Sticky",
  "creamy": "Creamy",
  "watery": "Watery", 
  "eggWhite": "Egg White"
};

// Display names for moods (updated to match Today page)
const moodNames: string[] = ["Awful", "Bad", "Okay", "Good", "Great"];

// Restore multi-color lines for symptoms
const colors = [
  '#9C6DFF', /* Bright purple */
  '#4DA6FF', /* Bright blue */
  '#FF7EB6', /* Pink */
  '#4AC6B7', /* Teal */
  '#FFCC33', /* Gold */
  '#7978E9', /* Periwinkle */
  '#FF6E6A'  /* Coral */
];

// Restore phase background colors, semi-transparent for visual comfort
const phaseColors = {
  period: "rgba(180, 80, 110, 0.22)",     // Dusky rose
  follicular: "rgba(180, 160, 100, 0.19)", // Dusky gold
  ovulation: "rgba(90, 130, 180, 0.19)",   // Dusky blue
  luteal: "rgba(120, 95, 160, 0.19)"       // Dusky purple
};

// --- Purple theme color for switches and buttons (from 'today' tab) ---
const purpleTheme = {
  bg: 'bg-primary',
  border: 'border-primary',
  text: 'text-primary-foreground',
  hover: 'hover:bg-accent',
};

const TimeSeriesCharts: React.FC<TimeSeriesChartsProps> = ({ 
  userId, 
  symptomRecords, 
  moodRecords, 
  cervicalMucusRecords,
  symptoms, 
  flowRecords,
  cycles
}) => {
  // Helper to get all hidden symptom IDs from user settings (if provided)
  // This prop is not available directly, so you must filter hidden symptoms before passing them here.
  // If hidden symptom IDs are available via props or context, filter here:
  // const visibleSymptoms = symptoms.filter(s => !hiddenSymptomIds.includes(s.id));
  // For now, assume symptoms prop is already filtered.

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedMucusTypes, setSelectedMucusTypes] = useState<string[]>([]);
  const [showCyclePhases, setShowCyclePhases] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('90days'); // Default 90 days
  const [showLegend, setShowLegend] = useState(true);
  
  // Time range options for dropdown
  const timeRangeOptions = [
    { value: '30days', label: '30 Days' },
    { value: '90days', label: '90 Days' },
    { value: '180days', label: '6 Months' },
    { value: '365days', label: '1 Year' },
  ];
  
  const { userSettings, getAverageCycleLength } = useCycleData({ userId });
  const defaultCycleLength = (userSettings && userSettings.defaultCycleLength) || getAverageCycleLength() || 28;
  
  // Prepare symptom chart data
  const [symptomData, setSymptomData] = useState<Array<{
    date: Date;
    month: string;
    phase?: 'period' | 'follicular' | 'ovulation' | 'luteal' | undefined;
    [key: string]: any;
  }>>([]);
  
  // Prepare mood chart data
  const [moodData, setMoodData] = useState<Array<{
    date: Date;
    month: string;
    phase?: 'period' | 'follicular' | 'ovulation' | 'luteal' | undefined;
    terrible: number;
    bad: number;
    neutral: number;
    good: number;
    great: number;
    [key: string]: any; // Add index signature to allow dynamic access
  }>>([]);
  
  // Prepare cervical mucus chart data
  const [mucusData, setMucusData] = useState<Array<{
    date: Date;
    month: string;
    phase?: 'period' | 'follicular' | 'ovulation' | 'luteal' | undefined;
    dry: number;
    sticky: number;
    creamy: number;
    watery: number;
    eggWhite: number;
    [key: string]: any; // Add index signature to allow dynamic access
  }>>([]);
  
  // Toggle symptom selection
  const toggleSymptomSelection = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms(prev => [...prev, symptom]);
    }
  };
  
  // Toggle mood selection
  const toggleMoodSelection = (mood: string) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(prev => prev.filter(m => m !== mood));
    } else {
      setSelectedMoods(prev => [...prev, mood]);
    }
  };
  
  // Toggle cervical mucus type selection
  const toggleMucusSelection = (mucusType: string) => {
    if (selectedMucusTypes.includes(mucusType)) {
      setSelectedMucusTypes(prev => prev.filter(t => t !== mucusType));
    } else {
      setSelectedMucusTypes(prev => [...prev, mucusType]);
    }
  };
  
  // Generate time series data
  useEffect(() => {
    // Extract all symptom names and set unique values
    const symptomMap = new Map<number, string>();
    symptoms.forEach(s => symptomMap.set(s.id, s.name));

    // Fallback color for unknown symptoms
    const fallbackColor = 'hsl(var(--muted-foreground))';

    // Build unique symptom names from records, including unknowns
    const uniqueSymptoms = Array.from(new Set(
      symptomRecords.map(record => symptomMap.get(record.symptomId) || `Unknown Symptom (${record.symptomId})`)
    ));

    setAllSymptoms(uniqueSymptoms);
    
    // Set initial selected symptoms (up to 3)
    if (selectedSymptoms.length === 0 && uniqueSymptoms.length > 0) {
      setSelectedSymptoms(uniqueSymptoms.slice(0, Math.min(3, uniqueSymptoms.length)));
    }
    
    // Set initial selected moods (all)
    if (selectedMoods.length === 0) {
      setSelectedMoods(['awful', 'bad', 'okay', 'good', 'great']);
    }
    
    // Set initial selected mucus types (all)
    if (selectedMucusTypes.length === 0) {
      setSelectedMucusTypes(['dry', 'sticky', 'creamy', 'watery', 'eggWhite']);
    }
    
    // Determine date range
    const today = new Date();
    let startDate = new Date();
    
    if (timeRange === '30days') {
      startDate = subDays(today, 30);
    } else if (timeRange === '90days') {
      startDate = subDays(today, 90);
    } else if (timeRange === '180days') {
      startDate = subDays(today, 180);
    } else if (timeRange === '365days') {
      startDate = subDays(today, 365);
    }
    
    // Get all periods
    const periodFlowRecords = flowRecords.filter(r => 
      ['spotting', 'light', 'medium', 'heavy'].includes(r.intensity)
    );
    
    // Generate daily data points
    const dailyData: Record<string, {
      date: Date;
      month: string;
      phase?: 'period' | 'follicular' | 'ovulation' | 'luteal';
      [key: string]: any;
    }> = {};
    
    // Initialize data for each day
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      dailyData[dateStr] = {
        date: new Date(currentDate),
        month: format(currentDate, 'MMM d'),
      };
      
      // Check if current date is a period day
      const isInPeriod = periodFlowRecords.some(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === currentDate.getFullYear() &&
               recordDate.getMonth() === currentDate.getMonth() &&
               recordDate.getDate() === currentDate.getDate();
      });
      
      if (isInPeriod) {
        dailyData[dateStr].phase = 'period';
      } else {
        // If not in period, use cycle phase from last period start date
        if (cycles.length > 0) {
          // Sort cycles by start date (newest first)
          const sortedCycles = [...cycles].sort((a, b) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          
          // Find most recent cycle that started before or on this date
          const relevantCycle = sortedCycles.find(c => 
            new Date(c.startDate) <= currentDate
          );
          
          if (relevantCycle) {
            const cyclePhase = getCyclePhase(
              currentDate,
              new Date(relevantCycle.startDate),
              defaultCycleLength
            );
            
            if (cyclePhase === 'period') {
              dailyData[dateStr].phase = 'period';
            } else if (cyclePhase === 'follicular') {
              dailyData[dateStr].phase = 'follicular';
            } else if (cyclePhase === 'ovulation') {
              dailyData[dateStr].phase = 'ovulation';
            } else if (cyclePhase === 'luteal') {
              dailyData[dateStr].phase = 'luteal';
            }
          }
        }
      }
      
      // Initialize all symptom intensities to 0
      uniqueSymptoms.forEach(symptom => {
        dailyData[dateStr][symptom] = 0;
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Populate symptom data
    symptomRecords.forEach(record => {
      const dateStr = record.date.split('T')[0];
      const symptomName = symptomMap.get(record.symptomId);
      
      if (dailyData[dateStr] && symptomName && record.intensity !== null) {
        dailyData[dateStr][symptomName] = record.intensity;
      }
    });
    
    // Convert to array for chart
    const symptomChartData = Object.values(dailyData);
    setSymptomData(symptomChartData);
    
    // Create structured mood data with counts for each mood type
    const moodChartData = Object.values(dailyData).map(item => {
      const dateStr = format(item.date, 'yyyy-MM-dd');
      const matchingMood = moodRecords.find(m => m.date.split('T')[0] === dateStr);
      
      // Define with explicit type and index signature
      const moodEntry: {
        date: Date;
        month: string;
        phase?: 'period' | 'follicular' | 'ovulation' | 'luteal';
        terrible: number;
        bad: number;
        neutral: number;
        good: number;
        great: number;
        [key: string]: any;
      } = {
        date: item.date,
        month: item.month,
        phase: item.phase,
        terrible: 0,
        bad: 0,
        neutral: 0, 
        good: 0,
        great: 0
      };
      
      if (matchingMood && matchingMood.mood) {
        // Type guard to ensure the mood name is a valid index
        const moodName = matchingMood.mood;
        if (moodName === 'terrible' || moodName === 'bad' || moodName === 'neutral' || 
            moodName === 'good' || moodName === 'great') {
          moodEntry[moodName] = 1;
        }
      }
      
      return moodEntry;
    });
    
    setMoodData(moodChartData);
    
    // Create structured cervical mucus data with counts for each type
    const mucusChartData = Object.values(dailyData).map(item => {
      const dateStr = format(item.date, 'yyyy-MM-dd');
      const matchingMucus = cervicalMucusRecords?.find(m => m.date.split('T')[0] === dateStr);
      
      // Define with explicit type and index signature
      const mucusEntry: {
        date: Date;
        month: string;
        phase?: 'period' | 'follicular' | 'ovulation' | 'luteal';
        dry: number;
        sticky: number;
        creamy: number;
        watery: number;
        eggWhite: number;
        [key: string]: any;
      } = {
        date: item.date,
        month: item.month,
        phase: item.phase,
        dry: 0,
        sticky: 0,
        creamy: 0,
        watery: 0,
        eggWhite: 0
      };
      
      if (matchingMucus && matchingMucus.type) {
        // Type guard to ensure the mucus type is a valid index
        const mucusType = matchingMucus.type;
        if (mucusType === 'dry' || mucusType === 'sticky' || mucusType === 'creamy' || 
            mucusType === 'watery' || mucusType === 'eggWhite') {
          mucusEntry[mucusType] = 1;
        }
      }
      
      return mucusEntry;
    });
    
    setMucusData(mucusChartData);
    
  }, [symptomRecords, moodRecords, cervicalMucusRecords, symptoms, flowRecords, cycles, timeRange, defaultCycleLength]);
  
  // --- Y-axis Labels for Intensity (labels only, with padding and unique key) ---
  const intensityLabels = [
    { value: 1, label: 'Mild' },
    { value: 2, label: 'Moderate' },
    { value: 3, label: 'Severe' },
    { value: 4, label: 'Very Severe' }
  ];

  // --- Switch color constants for consistency ---
  const selectedSwitchBg = "bg-accent border-accent shadow-sm";
  const unselectedSwitchBg = "bg-input border border-gray-300";

  // --- Legend toggle switch (purple themed, below cycle phases) ---
  const LegendToggle = () => (
    <div className="flex items-center mt-2">
      <span className="mr-2 text-xs text-muted-foreground">Show legend</span>
      <div 
        role="button"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none cursor-pointer ${showLegend ? selectedSwitchBg : unselectedSwitchBg}`}
        onClick={() => setShowLegend(l => !l)}
      >
        <span className={`transition-transform inline-block h-4 w-4 rounded-full bg-background border ${showLegend ? 'translate-x-5 border-accent' : 'translate-x-1 border-gray-300'}`}></span>
      </div>
    </div>
  );

  // --- Symptom button purple theme ---
  const symptomButtonClass = (selected: boolean) =>
    `rounded-full text-xs h-8 border ${purpleTheme.border} ${selected ? purpleTheme.bg + ' text-white' : 'bg-background ' + purpleTheme.text} ${purpleTheme.hover}`;

  // --- Mood button purple theme ---
  const moodButtonClass = (selected: boolean) =>
    selected
      ? "rounded-full text-xs h-8 border bg-accent text-accent-foreground border-accent shadow-sm"
      : `rounded-full text-xs h-8 border ${purpleTheme.border} bg-background ${purpleTheme.text} ${purpleTheme.hover}`;

  // --- Custom scrollbar CSS for selector areas ---
  const selectorScrollbarStyle = {
    // Use valid TypeScript types for scrollbar styling
    // We'll use className approach instead for browser compatibility
  };

  // --- Mood selection logic for single line chart ---
  const allMoodKeys = ['awful', 'bad', 'okay', 'good', 'great'];

  const filterMoodData = (moodData: any[], selectedMoods: string[]) => {
    // For each day, if the mood matches one of the selected moods, include it
    return moodData.map((data, i) => {
      let moodKey = null;
      if (data.great) moodKey = 'great';
      else if (data.good) moodKey = 'good';
      else if (data.neutral) moodKey = 'okay';
      else if (data.bad) moodKey = 'bad';
      else if (data.terrible) moodKey = 'awful';
      if (moodKey && selectedMoods.includes(moodKey)) {
        return { index: i, moodKey };
      }
      return null;
    });
  };

  // --- Symptom Selector Modal State ---
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomCategory, setSymptomCategory] = useState<'all' | 'physical' | 'emotional' | 'pmdd'>('all');
  const [modalSelectedSymptoms, setModalSelectedSymptoms] = useState<string[]>(selectedSymptoms);

  // --- Group symptoms by category ---
  const groupedSymptoms = React.useMemo(() => {
    const groups: Record<string, { id: number; name: string; category: string }[]> = {
      physical: [], emotional: [], pmdd: []
    };
    symptoms.forEach(sym => {
      if (sym.category.toLowerCase() === 'physical') groups.physical.push(sym);
      else if (sym.category.toLowerCase() === 'emotional') groups.emotional.push(sym);
      else if (sym.category.toLowerCase() === 'pmdd') groups.pmdd.push(sym);
    });
    return groups;
  }, [symptoms]);

  // --- Symptom Modal UI (improved readability, always mounted) ---
  const SymptomModal = React.useMemo(() => (
    <AlertDialog open={showSymptomModal} onOpenChange={setShowSymptomModal}>
      <AlertDialogContent className="max-w-md w-full rounded-xl select-symptoms-popup">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-accent">Select Symptoms</AlertDialogTitle>
          {/* Accessibility description for screen readers and context */}
          <AlertDialogDescription>
            Choose which symptoms to display on the chart. Use the tabs to filter by category. Your selection will update the chart instantly when you click Done.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Category Tabs */}
        <div className="flex gap-2 mb-4">
          {['all', 'physical', 'emotional', 'pmdd'].map(cat => (
            <button
              key={cat}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors duration-100 ${symptomCategory === cat ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-[#ede9fe]'}`}
              onClick={() => setSymptomCategory(cat as any)}
              type="button"
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        {/* Select All / Deselect All */}
        <div className="flex gap-2 mb-2">
          <Button size="sm" variant="ghost" className="text-accent hover:bg-accent-foreground" onClick={() => {
            let all: string[] = [];
            if (symptomCategory === 'all') {
              all = symptoms.map(s => s.name);
            } else {
              all = groupedSymptoms[symptomCategory].map(s => s.name);
            }
            setModalSelectedSymptoms(all);
          }}>Select All</Button>
          <Button size="sm" variant="ghost" className="text-accent hover:bg-accent-foreground" onClick={() => {
            if (symptomCategory === 'all') setModalSelectedSymptoms([]);
            else setModalSelectedSymptoms(prev => prev.filter(name => !groupedSymptoms[symptomCategory].some(s => s.name === name)));
          }}>Deselect All</Button>
        </div>
        {/* Symptom List with improved readability */}
        <div className="max-h-60 overflow-y-auto grid grid-cols-1 gap-2 mb-4">
          {(symptomCategory === 'all' ? symptoms : groupedSymptoms[symptomCategory]).map(sym => (
            <label key={sym.id} className={`symptom-item flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition-colors text-xs font-normal ${modalSelectedSymptoms.includes(sym.name)
              ? 'selected'
              : ''
            }`}>
              <input
                type="checkbox"
                checked={modalSelectedSymptoms.includes(sym.name)}
                onChange={() => {
                  setModalSelectedSymptoms(prev =>
                    prev.includes(sym.name)
                      ? prev.filter(n => n !== sym.name)
                      : [...prev, sym.name]
                  );
                }}
                className="accent-accent"
              />
              <span className="text-xs">{sym.name}</span>
              <span className={`text-xs ml-1 ${modalSelectedSymptoms.includes(sym.name) ? 'text-accent-foreground' : 'text-gray-400'}`}>({sym.category})</span>
            </label>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-gray-500">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-accent hover:bg-accent-foreground text-accent-foreground"
            onClick={() => {
              setSelectedSymptoms(modalSelectedSymptoms);
              setShowSymptomModal(false);
            }}
          >
            Done
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ), [showSymptomModal, symptomCategory, modalSelectedSymptoms, symptoms, groupedSymptoms, setSelectedSymptoms]);

  // --- Select Symptoms Button: exact style per user spec ---
  const SelectSymptomsButton = () => (
    <Button
      onClick={() => {
        setModalSelectedSymptoms(selectedSymptoms);
        setShowSymptomModal(true);
      }}
      variant="outline"
      className="rounded-full px-3 py-1.5 text-[rgb(250,250,250)] bg-[rgb(9,9,11)] border border-[rgb(39,39,42)] text-xs font-medium shadow-sm hover:bg-accent hover:text-[rgb(250,250,250)] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-0"
      style={{ minHeight: '1.8rem', height: '2rem', lineHeight: '1.2' }}
    >
      Select Symptoms
    </Button>
  );

  // Map flow intensity strings to numeric values
  const flowIntensityMap: Record<string, number> = {
    none: 0,
    spotting: 1,
    light: 2,
    medium: 3,
    heavy: 4,
  };
  const flowIntensityLabels = ["None", "Spotting", "Light", "Medium", "Heavy"];

  // Prepare data for the bar chart
  const [flowRange, setFlowRange] = useState<'30days' | '90days' | '6months' | '1year' | 'all'>('90days');
  const today = new Date();
  let flowStartDate = today;
  if (flowRange === '30days') flowStartDate = subDays(today, 30);
  else if (flowRange === '90days') flowStartDate = subDays(today, 90);
  else if (flowRange === '6months') flowStartDate = subDays(today, 183);
  else if (flowRange === '1year') flowStartDate = subDays(today, 365);
  else flowStartDate = new Date('1970-01-01');

  const filteredFlowData = flowRecords
    .filter(rec => 
      isAfter(new Date(rec.date), flowStartDate) || format(new Date(rec.date), 'yyyy-MM-dd') === format(flowStartDate, 'yyyy-MM-dd')
    )
    .map((rec) => ({
      date: rec.date,
      intensity: flowIntensityMap[rec.intensity] ?? 0,
    }));

  // --- Top Symptoms calculation ---
  let symptomStartDate = new Date();
  if (timeRange === '30days') symptomStartDate = subDays(today, 30);
  else if (timeRange === '90days') symptomStartDate = subDays(today, 90);
  else if (timeRange === '180days') symptomStartDate = subDays(today, 180);
  else if (timeRange === '365days') symptomStartDate = subDays(today, 365);
  const filteredSymptomRecords = symptomRecords.filter(rec => {
    const recDate = new Date(rec.date);
    return recDate >= symptomStartDate && recDate <= today;
  });
  const symptomIdToName: Record<number, string> = {};
  symptoms.forEach(s => { symptomIdToName[s.id] = s.name; });
  const symptomCounts: Record<string, number> = {};
  filteredSymptomRecords.forEach(rec => {
    const name = symptomIdToName[rec.symptomId];
    if (name) {
      symptomCounts[name] = (symptomCounts[name] || 0) + 1;
    }
  });
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // --- Shared legend style for symptom and phase legends ---
  const legendItemClass = "flex items-center gap-0.5 mr-1 mb-1";
  const legendDotClass = "inline-block w-3 h-3 rounded-full";
  const legendLabelClass = "text-xs";

  return (
    <Card className="bg-card rounded-lg p-4 mb-6">
      <CardContent className="p-0">
        <h3 className="text-lg font-semibold mb-4">Changes Over Time</h3>
        
        {/* Time range selection */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">Time Range:</div>
          <div className="w-36">
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Switches: cycle phases, then legend, then symptom buttons (all purple themed) */}
        <div className="flex flex-col items-end self-end mb-3 gap-2">
          <div className="flex items-center">
            <span className="mr-2 text-xs text-muted-foreground">Show cycle phases</span>
            <div 
              role="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none cursor-pointer ${showCyclePhases ? selectedSwitchBg : unselectedSwitchBg}`}
              onClick={() => setShowCyclePhases(!showCyclePhases)}
            >
              <span className={`transition-transform inline-block h-4 w-4 rounded-full bg-background border ${showCyclePhases ? 'translate-x-5 border-accent' : 'translate-x-1 border-gray-300'}`}></span>
            </div>
          </div>
          <div className="flex items-center">
            <LegendToggle />
          </div>
        </div>
        
        {/* Symptom tracking */}
        <div className="mb-8">
          <h4 className="text-md font-medium mb-2">Symptom Intensity Over Time</h4>
          
          {/* Select Symptoms Button */}
          <div className="mb-1 flex flex-col items-start">
            <SelectSymptomsButton />
            {SymptomModal}
          </div>
          
          <div className="h-64 relative mb-4">
            <svg width="100%" height="100%" viewBox="0 0 500 200">              
              {/* Phase background colors if enabled */}
              {showCyclePhases && symptomData.length > 0 && (
                <>
                  {symptomData.map((data, i) => {
                    // Calculate width of each section
                    const segmentWidth = 500 / Math.max(1, symptomData.length - 1);
                    const x = i * segmentWidth;
                    const width = i < symptomData.length - 1 ? segmentWidth : 10;
                    
                    return data.phase ? (
                      <rect 
                        key={i} 
                        x={x} 
                        y={0} 
                        width={width} 
                        height={200}
                        style={{
                          fill:
                            data.phase === "follicular" ? phaseColors.follicular :
                            data.phase === "ovulation" ? phaseColors.ovulation :
                            data.phase === "luteal" ? phaseColors.luteal :
                            data.phase === "period" ? phaseColors.period :
                            "transparent"
                        }}
                      />
                    ) : null;
                  })}
                </>
              )}
              
              {/* Grid lines */}
              <line x1="0" y1="0" x2="500" y2="0" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="200" x2="500" y2="200" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              
              {/* Y-axis labels (labels only, with padding and unique key) */}
              {intensityLabels.map(({ value, label }, idx) => (
                <text key={label} x="10" y={200 - ((value - 1) / 3) * 180 - 5} fill="#a1a1aa" fontSize="10">{label}</text>
              ))}
              
              {/* Data lines for each selected symptom */}
              {selectedSymptoms.map((symptomName, index) => {
                // Use fallback color for unknowns
                const color = symptomName.startsWith('Unknown Symptom') ? 'hsl(var(--muted-foreground))' : colors[index % colors.length];
                
                return (
                  <g key={symptomName}>
                    <path 
                      d={symptomData.map((data, i) => {
                        const x = (i * 500) / Math.max(1, symptomData.length - 1);
                        // If value is missing/zero, default to 1 (Mild)
                        const intensity = data[symptomName] && data[symptomName] >= 1 ? data[symptomName] : 1;
                        // Scale from 1-4 to chart height (200px), but with 10px top and bottom padding
                        const y = 190 - ((intensity - 1) / 3) * 180;
                        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                      }).join(' ')} 
                      stroke={color} 
                      strokeWidth="2"
                      fill="none" 
                    />
                    
                    {/* Data points */}
                    {symptomData.map((data, i) => {
                      const x = (i * 500) / Math.max(1, symptomData.length - 1);
                      const intensity = data[symptomName] && data[symptomName] >= 1 ? data[symptomName] : 1;
                      const y = 190 - ((intensity - 1) / 3) * 180;
                      return intensity > 0 ? (
                        <circle 
                          key={i} 
                          cx={x} 
                          cy={y} 
                          r="2.5" 
                          fill={color} 
                        />
                      ) : null;
                    })}
                  </g>
                );
              })}
              
              {/* Date labels - improved spacing for long ranges, monthly for 'Year' */}
              {(() => {
                let interval = 1;
                let useMonth = false;
                if (timeRange === '365days') { interval = Math.ceil(symptomData.length / 12); useMonth = true; }
                else if (timeRange === '180days') interval = Math.ceil(symptomData.length / 8);
                else if (symptomData.length > 60) interval = 10;
                else if (symptomData.length > 30) interval = 5;
                else if (symptomData.length > 14) interval = 2;
                return symptomData.map((data, i) => {
                  if (i % interval === 0 || i === symptomData.length - 1) {
                    const x = (i * 500) / Math.max(1, symptomData.length - 1);
                    let label = useMonth ? data.month.split(' ')[0] : data.month;
                    return (
                      <text 
                        key={x + '-' + label}
                        x={x} 
                        y="220" 
                        textAnchor="middle" 
                        fill="#a1a1aa" 
                        fontSize="9"
                      >
                        {label}
                      </text>
                    );
                  }
                  return null;
                });
              })()}
            </svg>
          </div>
          
          {/* Legend toggle switch */}
          {/* <div className="flex justify-end mb-2">
            <LegendToggle />
          </div> */}
          
          {/* Legend */}
          {showLegend && (
            <div className="flex flex-wrap gap-x-1 gap-y-1 mt-2 mb-2">
              {selectedSymptoms.map((symptomName, index) => {
                const color = symptomName.startsWith('Unknown Symptom') ? 'hsl(var(--muted-foreground))' : colors[index % colors.length];
                
                return (
                  <div key={symptomName} className={legendItemClass}>
                    <span style={{ backgroundColor: color }} className={legendDotClass}></span>
                    <span className={legendLabelClass}>{symptomName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Mood tracking */}
        <div className="mt-8">
          <h4 className="text-md font-medium mb-2">Mood Over Time</h4>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full text-xs"
                onClick={() => {
                  setSelectedMoods([...allMoodKeys]);
                }}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-full text-xs"
                onClick={() => {
                  setSelectedMoods([]);
                }}
              >
                Deselect All
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-1 custom-scrollbar">
            {allMoodKeys.map((mood, index) => (
              <Button
                key={mood}
                variant={selectedMoods.includes(mood) ? "secondary" : "outline"}
                className={moodButtonClass(selectedMoods.includes(mood))}
                onClick={() => setSelectedMoods(selectedMoods.includes(mood) ? selectedMoods.filter(m => m !== mood) : [...selectedMoods, mood])}
              >
                {moodNames[index]}
              </Button>
            ))}
          </div>
          
          <div className="h-64 relative mb-4">
            <svg width="100%" height="100%" viewBox="0 0 500 200">
              {/* Phase background colors if enabled */}
              {showCyclePhases && moodData.length > 0 && (
                <>
                  {moodData.map((data, i) => {
                    // Calculate width of each section
                    const segmentWidth = 500 / Math.max(1, moodData.length - 1);
                    const x = i * segmentWidth;
                    const width = i < moodData.length - 1 ? segmentWidth : 10;
                    
                    return data.phase ? (
                      <rect 
                        key={i} 
                        x={x} 
                        y={0} 
                        width={width} 
                        height={200}
                        style={{
                          fill:
                            data.phase === "follicular" ? phaseColors.follicular :
                            data.phase === "ovulation" ? phaseColors.ovulation :
                            data.phase === "luteal" ? phaseColors.luteal :
                            data.phase === "period" ? phaseColors.period :
                            "transparent"
                        }}
                      />
                    ) : null;
                  })}
                </>
              )}
              
              {/* Grid lines */}
              <line x1="0" y1="0" x2="500" y2="0" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="200" x2="500" y2="200" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
              
              {/* Y-axis labels (mood scale) */}
              <text x="10" y="190" fill="#a1a1aa" fontSize="10">Awful</text>
              <text x="10" y="150" fill="#a1a1aa" fontSize="10">Bad</text>
              <text x="10" y="100" fill="#a1a1aa" fontSize="10">Okay</text>
              <text x="10" y="50" fill="#a1a1aa" fontSize="10">Good</text>
              <text x="10" y="15" fill="#a1a1aa" fontSize="10">Great</text>
              
              {/* Draw line segments between consecutive valid points (skip nulls, type-safe) */}
              {(() => {
                const filtered = filterMoodData(moodData, selectedMoods).filter((x): x is {index: number; moodKey: string} => x !== null);
                console.log('Mood chart filtered points:', filtered.length, filtered);
                if (filtered.length === 0) return null;
                if (filtered.length === 1) return null; // Only one point, no line
                let segments: string[] = [];
                let prev: {index: number; moodKey: string} | null = null;
                filtered.forEach((item) => {
                  if (prev) {
                    const { index: i1, moodKey: m1 } = prev;
                    const { index: i2, moodKey: m2 } = item;
                    const x1 = (i1 * 500) / Math.max(1, moodData.length - 1);
                    const y1 = 190 - (allMoodKeys.indexOf(m1) * 45);
                    const x2 = (i2 * 500) / Math.max(1, moodData.length - 1);
                    const y2 = 190 - (allMoodKeys.indexOf(m2) * 45);
                    segments.push(`M${x1},${y1} L${x2},${y2}`);
                  }
                  prev = item;
                });
                return segments.map((seg, i) => (
                  <path key={i} d={seg} stroke="hsl(var(--accent))" strokeWidth="2.5" fill="none" />
                ));
              })()}
              {/* Draw a single point if only one mood is present */}
              {(() => {
                const filtered = filterMoodData(moodData, selectedMoods).filter((x): x is {index: number; moodKey: string} => x !== null);
                if (filtered.length === 1) {
                  const { index, moodKey } = filtered[0];
                  const x = (index * 500) / Math.max(1, moodData.length - 1);
                  const y = 190 - (allMoodKeys.indexOf(moodKey) * 45);
                  return <circle cx={x} cy={y} r="4" fill="hsl(var(--accent))" />;
                }
                return null;
              })()}
              {/* Data points for each mood entry (selected moods only, always purple) */}
              {(() => {
                const filtered = filterMoodData(moodData, selectedMoods).filter((x): x is {index: number; moodKey: string} => x !== null);
                return filtered.map((item) => {
                  const { index, moodKey } = item;
                  const x = (index * 500) / Math.max(1, moodData.length - 1);
                  const y = 190 - (allMoodKeys.indexOf(moodKey) * 45);
                  return (
                    <circle key={index} cx={x} cy={y} r="3" fill="hsl(var(--accent))" />
                  );
                });
              })()}
              {/* Date labels */}
              {(() => {
                let interval = 1;
                let useMonth = false;
                if (timeRange === '365days') { interval = Math.ceil(moodData.length / 12); useMonth = true; }
                else if (timeRange === '180days') interval = Math.ceil(moodData.length / 8);
                else if (moodData.length > 60) interval = 10;
                else if (moodData.length > 30) interval = 5;
                else if (moodData.length > 14) interval = 2;
                return moodData.map((data, i) => {
                  if (i % interval === 0 || i === moodData.length - 1) {
                    const x = (i * 500) / Math.max(1, moodData.length - 1);
                    let label = useMonth ? data.month.split(' ')[0] : data.month;
                    if (timeRange === '365days') {
                      label = format(new Date(data.date), 'MMM');
                    }
                    return (
                      <text 
                        key={x + '-' + label}
                        x={x} 
                        y="220" 
                        textAnchor="middle" 
                        fill="#a1a1aa" 
                        fontSize="9"
                      >
                        {label}
                      </text>
                    );
                  }
                  return null;
                });
              })()}
            </svg>
          </div>
          
          {/* Phase legend */}
          {showCyclePhases && (
            <div className="flex flex-wrap gap-x-1 gap-y-1 mt-6 mb-2">
              <div className={legendItemClass}>
                <span className={legendDotClass} style={{ backgroundColor: phaseColors.period }}></span>
                <span className={legendLabelClass}>Period</span>
              </div>
              <div className={legendItemClass}>
                <span className={legendDotClass} style={{ backgroundColor: phaseColors.follicular }}></span>
                <span className={legendLabelClass}>Follicular</span>
              </div>
              <div className={legendItemClass}>
                <span className={legendDotClass} style={{ backgroundColor: phaseColors.ovulation }}></span>
                <span className={legendLabelClass}>Ovulation</span>
              </div>
              <div className={legendItemClass}>
                <span className={legendDotClass} style={{ backgroundColor: phaseColors.luteal }}></span>
                <span className={legendLabelClass}>Luteal</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Flow Intensity Over Time */}
        <div className="mt-8">
          <h4 className="text-md font-medium mb-2">Flow Intensity Over Time</h4>
          <div className="flex gap-2 mb-2">
            {[
              { label: '30d', value: '30days' },
              { label: '90d', value: '90days' },
              { label: '6mo', value: '6months' },
              { label: '1yr', value: '1year' },
              { label: 'All', value: 'all' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors duration-100 ${flowRange === opt.value ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-background border-gray-200 text-gray-600 hover:bg-[#ede9fe]'}`}
                onClick={() => setFlowRange(opt.value as any)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredFlowData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ede9fe" />
              <XAxis
                dataKey="date"
                tickFormatter={d => d.slice(5)}
                fontSize={12}
                stroke="#a1a1aa"
                tick={{ fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={{ stroke: '#a1a1aa' }}
              />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tickFormatter={i => flowIntensityLabels[i]}
                fontSize={12}
                stroke="#a1a1aa"
                tick={{ fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={{ stroke: '#a1a1aa' }}
              />
              <Bar
                dataKey="intensity"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                maxBarSize={24}
                isAnimationActive={true}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Symptoms - moved below flow chart */}
        {topSymptoms.length > 0 && (
          <div className="mb-4">
            <h4 className="text-md font-medium mb-1">Top Symptoms</h4>
            <ol className="list-none text-sm text-muted-foreground">
              {topSymptoms.map(([name, count], idx) => (
                <li key={name} className="flex items-baseline py-0.5">
                  <span className="text-muted-foreground whitespace-nowrap pr-2 align-baseline" style={{ minWidth: 0 }}>{name}</span>
                  <span className="flex-grow border-b border-dotted border-gray-300 mx-2 align-baseline relative" style={{ height: 0, top: '0.07em' }}></span>
                  <span className="text-xs text-right font-bold min-w-[2ch] tabular-nums align-baseline" style={{ color: 'hsl(var(--accent))' }}>{count}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        
        {/* Cervical mucus tracking - Only show if records exist */}
        {cervicalMucusRecords && cervicalMucusRecords.length > 0 && (
          <div className="mt-8">
            <h4 className="text-md font-medium mb-2">Cervical Mucus Over Time</h4>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full text-xs"
                  onClick={() => {
                    setSelectedMucusTypes(['dry', 'sticky', 'creamy', 'watery', 'eggWhite']);
                  }}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => {
                    setSelectedMucusTypes([]);
                  }}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(mucusTypeNames).map((mucusType) => (
                <Button
                  key={mucusType}
                  variant={selectedMucusTypes.includes(mucusType) ? "secondary" : "outline"}
                  className="rounded-full text-xs h-8"
                  onClick={() => toggleMucusSelection(mucusType)}
                >
                  {mucusTypeNames[mucusType]}
                </Button>
              ))}
            </div>
            
            <div className="h-64 relative mb-4">
              <svg width="100%" height="100%" viewBox="0 0 500 200">
                {/* Phase background colors if enabled */}
                {showCyclePhases && mucusData.length > 0 && (
                  <>
                    {mucusData.map((data, i) => {
                      // Calculate width of each section
                      const segmentWidth = 500 / Math.max(1, mucusData.length - 1);
                      const x = i * segmentWidth;
                      const width = i < mucusData.length - 1 ? segmentWidth : 10;
                      
                      return data.phase ? (
                        <rect 
                          key={i} 
                          x={x} 
                          y={0} 
                          width={width} 
                          height={200}
                          style={{
                            fill:
                              data.phase === "follicular" ? phaseColors.follicular :
                              data.phase === "ovulation" ? phaseColors.ovulation :
                              data.phase === "luteal" ? phaseColors.luteal :
                              data.phase === "period" ? phaseColors.period :
                              "transparent"
                          }}
                        />
                      ) : null;
                    })}
                  </>
                )}
                
                {/* Grid lines */}
                <line x1="0" y1="0" x2="500" y2="0" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="200" x2="500" y2="200" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Cervical mucus lines */}
                {selectedMucusTypes.map((mucusType, index) => {
                  const color = colors[index % colors.length];
                  
                  return (
                    <polyline
                      key={mucusType}
                      points={mucusData
                        .map((day, i) => {
                          const mucusValue = day[mucusType] || 0;
                          const x = i * (500 / Math.max(1, mucusData.length - 1));
                          // Scale the mucus intensity value (0-1) to the chart height (0-200)
                          const y = 200 - (mucusValue * 50);
                          return `${x},${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-x-1 gap-y-1 mt-2">
              {selectedMucusTypes.map((mucusType, index) => {
                const color = colors[index % colors.length];
                
                return (
                  <div key={mucusType} className={legendItemClass}>
                    <span className={legendDotClass} style={{ backgroundColor: color }}></span>
                    <span className={legendLabelClass}>{mucusTypeNames[mucusType]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Options */}
      </CardContent>
    </Card>
  );
};

export default TimeSeriesCharts;