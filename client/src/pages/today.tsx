import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    parseISO,
    isSameDay,
    isBefore,
    isAfter,
    format,
    addDays,
    differenceInDays,
    eachDayOfInterval,
    isToday
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
// Consider importing specific icons if CheckCircle2, Circle aren't used directly here
// import { CheckCircle2, Circle } from 'lucide-react';
import DropletIcon from '@/icons/DropletIcon';
import IntimateActivityButton from '@/components/symptoms/IntimateActivityButton';
import SymptomsList from '@/components/symptoms/symptoms-list';
import MoodSelector from '@/components/symptoms/mood-selector';
import CervicalMucusSelector from '@/components/symptoms/cervical-mucus-selector';
import DateNav from '@/components/date-nav';
import MedicationTracker from '@/components/medications/medication-tracker';
import { useCycleData, UserSettings } from '@/hooks/use-cycle-data'; 
import { useSymptoms } from '@/hooks/use-symptoms';
import { useIntimateActivity } from '@/hooks/use-intimate-activity';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter'; 
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getDataDrivenCyclePhase } from '@/lib/data-driven-cycle-phase';
import { getBestCyclePredictionLengths, isInFertileWindow } from '@/lib/cycle-utils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

interface UserSettingsProps {
    showPmddSymptoms?: boolean;
    showIntimacyCard?: boolean;
    defaultCycleLength?: number;
    defaultPeriodLength?: number;
}

interface TodayProps {
    userId: number;
}

// Helper to parse date from URL safely
const getInitialDateFromUrl = (): Date => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const dateParam = urlParams.get('date');
        if (dateParam) {
            const parsed = parseISO(dateParam);
            // Basic validation: check if it's a valid date object
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
            console.error("Invalid date parameter in URL:", dateParam);
        }
    } catch (e) {
        console.error("Error parsing date from URL:", e);
    }
    return new Date(); // Default to today
};

const Today: React.FC<TodayProps> = ({ userId }) => {
    const { toast } = useToast();
    const [, setLocation] = useLocation(); // Initialize setLocation with useLocation

    // --- State ---
    const [selectedDate, setSelectedDate] = useState<Date>(getInitialDateFromUrl);
    const [notes, setNotes] = useState<string>('');

    // --- Hooks for Data Fetching ---
    // Get user settings (including UI preferences)
    const { data: userSettings, isLoading: settingsLoading } = useQuery<UserSettingsProps>(
        {
            queryKey: [`/api/user-settings/${userId}`],
            enabled: userId > 0,
            staleTime: 1000 * 60 * 5 // Cache settings for 5 mins
        }
    );

    const {
        setSelectedDate: setCycleHookDate, // Renamed to avoid conflict
        cycles,
        // currentCycle, // Less reliable than finding active cycle for selected date
        cycleDay, // Cycle day relative to the current ongoing cycle, might be confusing for past dates
        flowRecords,
        isLoading: cycleLoading,
        startPeriod,
        endPeriod,
        cancelPeriod,
        recordFlow,
        refetchCycles
    } = useCycleData({ userId });

    const {
        physicalSymptoms,
        emotionalSymptoms,
        pmddSymptoms,
        dailyNote,
        moodRecord,
        cervicalMucusType,
        toggleSymptom,
        isSymptomActive,
        recordMood,
        recordCervicalMucus,
        saveDailyNote,
        getSymptomIntensity,
        updateSymptomIntensity,
        isLoading: symptomsLoading
    } = useSymptoms({
        userId,
        date: selectedDate,
        showPmddSymptoms: userSettings?.showPmddSymptoms ?? true // Default to true if not set
    });

    const {
        isLogged: isIntimateLogged,
        logIntimateActivity,
        isLoading: isIntimateLoading,
    } = useIntimateActivity({ userId, date: selectedDate });

    // --- Derived Data and Calculations (Memoized) ---

    // Find the flow record specifically for the selected date
    const currentFlow = useMemo(() => {
        if (!flowRecords) return null;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return flowRecords.find(record => record.date.split('T')[0] === dateStr);
    }, [flowRecords, selectedDate]);

    // Find the cycle (if any) that covers the selected date
    const activeCycleForSelectedDate = useMemo(() => {
        if (!cycles) return null;
        return cycles.find(cycle => {
            const cycleStartDate = parseISO(cycle.startDate);
            // Consider a cycle active on its start/end dates
            if (isSameDay(selectedDate, cycleStartDate)) return true;
            if (cycle.endDate && isSameDay(selectedDate, parseISO(cycle.endDate))) return true;

            // Check if selectedDate falls between start and end (exclusive of start/end handled above)
            const isAfterStart = isAfter(selectedDate, cycleStartDate);
            const isBeforeEnd = !cycle.endDate || isBefore(selectedDate, parseISO(cycle.endDate));

            return isAfterStart && isBeforeEnd;
        });
    }, [cycles, selectedDate]);

    // Calculate cycle phase, predictions, fertile window etc. based on selectedDate
    const cycleAnalysis = useMemo(() => {
        if (!flowRecords) {
            return {
                phase: 'Unknown',
                isFertile: false,
                isPredictedPeriod: false,
                dayOfCycle: null // Placeholder for a more specific calculation if needed
            };
        }

        // Filter and sort non-spotting records once
        const periodRecords = flowRecords
            .filter(r => r.intensity !== 'spotting')
            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

        // Identify period starts
        const periodStarts = periodRecords.reduce((acc, record, index) => {
            const currentDate = parseISO(record.date);
            if (index === 0 || differenceInDays(currentDate, parseISO(periodRecords[index - 1].date)) > 2) {
                acc.push(currentDate);
            }
            return acc;
        }, [] as Date[]);

        const { avgCycleLength, avgPeriodLength } = getBestCyclePredictionLengths(flowRecords, userSettings);

        // Find the most recent period start relative to the selected date
        const lastPeriodStart = periodStarts.filter(start => !isAfter(start, selectedDate)).pop();

        // --- Predictions ---
        const predictedPeriodDates = new Set<string>();
        if (periodStarts.length > 0) {
            const lastLoggedStart = periodStarts[periodStarts.length - 1];
            // Predict next 3 cycles based on the *last logged* start
            for (let cycleIndex = 1; cycleIndex <= 3; cycleIndex++) {
                const predictedStart = addDays(lastLoggedStart, avgCycleLength * cycleIndex);
                // Only predict future periods
                if (isAfter(predictedStart, new Date()) || isToday(predictedStart)) {
                    eachDayOfInterval({
                        start: predictedStart,
                        end: addDays(predictedStart, avgPeriodLength - 1)
                    }).forEach((d: Date) => {
                        predictedPeriodDates.add(format(d, 'yyyy-MM-dd'));
                    });
                }
            }
        }
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        const isPredicted = predictedPeriodDates.has(selectedDateStr);

        // --- Phase Calculation ---
        let phase: 'period' | 'follicular' | 'ovulation' | 'luteal' | 'Unknown' = 'Unknown';
        // Use currentFlow for *actual* period status on the day
        if (currentFlow && currentFlow.intensity !== 'spotting') {
            phase = 'period';
        } else if (isPredicted) {
             // If no actual flow but predicted, show as predicted
             phase = 'period'; // Treat as period for display, but flag it
        } else if (lastPeriodStart) {
            // Calculate phase based on last start only if not an actual/predicted period day
            phase = getDataDrivenCyclePhase(selectedDate, flowRecords, userSettings, [], lastPeriodStart);
        }

        // --- Fertile Window ---
        // Calculate based on the last *actual* period start
        const isFertile = lastPeriodStart
            ? isInFertileWindow(selectedDate, lastPeriodStart, avgCycleLength, avgPeriodLength) && phase !== 'period'
            : false;


        // --- Cycle Day (relative to the cycle containing selectedDate) ---
        let dayOfCycle = null;
        if (activeCycleForSelectedDate) {
            const cycleStartDate = parseISO(activeCycleForSelectedDate.startDate);
             // +1 because cycle day 1 is the start date itself
            dayOfCycle = differenceInDays(selectedDate, cycleStartDate) + 1;
             // Ensure day is not negative if selectedDate is somehow before start date (shouldn't happen with activeCycle logic)
             if (dayOfCycle < 1) dayOfCycle = null;
        }


        return {
            phase,
            isFertile,
            isPredictedPeriod: isPredicted && phase === 'period' && !(currentFlow && currentFlow.intensity !== 'spotting'), // Only true if predicted AND no actual flow logged
            dayOfCycle
        };
    }, [flowRecords, selectedDate, userSettings, activeCycleForSelectedDate, currentFlow]);


    // --- Effects ---

    // Update date in cycle hook and URL when local selectedDate changes
    useEffect(() => {
        setCycleHookDate(selectedDate);
        // Update URL query parameter without causing a full page reload
        const url = new URL(window.location.href);
        url.searchParams.set('date', format(selectedDate, 'yyyy-MM-dd'));
        // Use history.pushState or replaceState to avoid triggering router navigation
        window.history.replaceState({}, '', url.toString());

        // Optionally refetch data if staleTime isn't sufficient
        // refetchCycles(); // Might be too frequent, rely on query cache invalidation mostly
    }, [selectedDate, setCycleHookDate]);

    // Load notes when dailyNote data arrives or selected date changes
    useEffect(() => {
        setNotes(dailyNote?.notes || '');
    }, [dailyNote, selectedDate]); // Add selectedDate to reset notes when date changes

    // --- Event Handlers ---
    const handleDateChange = useCallback((newDate: Date) => {
        setSelectedDate(newDate);
    }, []); // No dependencies needed if it just sets state

    const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
    }, []);

    const handleSaveDailyEntry = useCallback(() => {
        saveDailyNote(notes);
        // You might want to save other things here if needed, but typically symptoms/mood etc are saved on interaction
        toast({
            title: "Entry Saved",
            description: `Your daily entry for ${format(selectedDate, 'MMMM d, yyyy')} has been saved.`,
            duration: 3000,
        });
    }, [notes, saveDailyNote, selectedDate, toast]);

    const handleStartPeriod = useCallback(() => {
        startPeriod(selectedDate);
        // Optionally record 'light' flow immediately after starting
        // Wait a moment for the cycle creation to potentially finish before recording flow
        // Note: This might still have race conditions. The robust way is handle this in startPeriod's onSuccess.
        setTimeout(() => {
            // Check if flow isn't already logged for the day before adding 'light'
             const currentFlowForStart = (flowRecords || []).find(r => isSameDay(parseISO(r.date), selectedDate));
             if (!currentFlowForStart || currentFlowForStart.intensity === 'spotting') { // Avoid overwriting existing medium/heavy
                 recordFlow('light', selectedDate);
             }
        }, 500); // Delay slightly (adjust as needed)
    }, [startPeriod, selectedDate, recordFlow, flowRecords]);

    const handleEndPeriod = useCallback(() => {
        if (!activeCycleForSelectedDate?.id) return;
        endPeriod(selectedDate, activeCycleForSelectedDate.id);
    }, [endPeriod, selectedDate, activeCycleForSelectedDate?.id]);

    const handleCancelPeriod = useCallback(() => {
        if (!activeCycleForSelectedDate?.id) return;
        cancelPeriod(activeCycleForSelectedDate.id);
    }, [cancelPeriod, activeCycleForSelectedDate?.id]);

    // --- Loading State ---
    const isLoading = cycleLoading || symptomsLoading || settingsLoading;

    if (isLoading) {
        return (
            <div className="px-4 py-6 flex justify-center items-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading your data...</p>
                </div>
            </div>
        );
    }

    // --- Render Logic ---
    const canEditFlow = !activeCycleForSelectedDate?.endDate || isSameDay(selectedDate, parseISO(activeCycleForSelectedDate.endDate)); // Allow editing on end date
    const isPeriodActive = activeCycleForSelectedDate && !activeCycleForSelectedDate.endDate;

    return (
        <div className="tab-content px-4 py-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">{isToday(selectedDate) ? 'Today' : 'Day View'}</h2>
                <Card>
                    <CardContent className="p-4">
                        {/* Date Navigation */}
                        <DateNav
                            selectedDate={selectedDate}
                            onDateChange={handleDateChange}
                            userId={userId} // Pass userId if needed by DateNav
                        />
                        <Separator className="my-3" />

                        {/* Cycle Status Badges */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {cycleAnalysis.dayOfCycle !== null && (
                                <div className="text-sm px-3 py-1 rounded-full bg-primary text-primary-foreground period-status-label">
                                    Cycle Day {cycleAnalysis.dayOfCycle}
                                </div>
                            )}
                            {cycleAnalysis.phase !== 'Unknown' && (
                                <div className={`text-sm px-3 py-1 rounded-full text-white period-status-label
                                    ${cycleAnalysis.phase === 'period' ? (cycleAnalysis.isPredictedPeriod ? 'bg-red-300' : 'bg-red-500') :
                                      cycleAnalysis.phase === 'follicular' ? 'bg-yellow-500' :
                                      cycleAnalysis.phase === 'ovulation' ? 'bg-blue-500' :
                                      cycleAnalysis.phase === 'luteal' ? 'bg-purple-500' :
                                      'bg-muted text-muted-foreground'}`}>
                                    {cycleAnalysis.isPredictedPeriod ? 'Predicted Period' : `${cycleAnalysis.phase.charAt(0).toUpperCase() + cycleAnalysis.phase.slice(1)} Phase`}
                                </div>
                            )}
                            {cycleAnalysis.isFertile && (
                                <div className="text-sm px-3 py-1 rounded-full bg-teal-500 text-white period-status-label flex items-center">
                                    <span className="inline-block w-2 h-2 bg-white rounded-full mr-1.5"></span>
                                    Fertile Window
                                </div>
                            )}
                        </div>

                        {/* Phase Description */}
                        {cycleAnalysis.phase !== 'Unknown' && !cycleAnalysis.isPredictedPeriod && (
                            <div className="mb-4 p-3 rounded-md text-sm bg-muted/40">
                                {cycleAnalysis.phase === 'period' && <p>Menstrual phase: Your period is logged for this day. Hormone levels are typically at their lowest.</p>}
                                {cycleAnalysis.phase === 'follicular' && <p>Follicular phase: Began after your last period and lasts until ovulation. Estrogen rises.</p>}
                                {cycleAnalysis.phase === 'ovulation' && <p>Ovulation phase: An egg is released. This is typically your most fertile time.</p>}
                                {cycleAnalysis.phase === 'luteal' && <p>Luteal phase: After ovulation, progesterone rises, preparing for potential pregnancy or the next period.</p>}
                            </div>
                        )}

                        {/* === Period Status Card === */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                                <h3 className="text-lg font-semibold">Period Status</h3>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    {/* Show Spotting/Start Period buttons if NO active cycle */}
                                    {!activeCycleForSelectedDate && (
                                        <>
                                            <Button
                                                variant={currentFlow?.intensity === 'spotting' ? 'default' : 'outline'}
                                                size="sm"
                                                className={`text-xs flex items-center gap-1 px-3 py-1.5 period-status-btn border-primary ${currentFlow?.intensity === 'spotting' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                                                onClick={() => recordFlow('spotting', selectedDate)}
                                            >
                                                <DropletIcon className="h-4 w-4" fillOpacity={currentFlow?.intensity === 'spotting' ? 0.3 : 0} />
                                                Spotting
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="text-xs flex items-center px-3 py-1.5 period-status-btn"
                                                onClick={handleStartPeriod}
                                            >
                                                Start Period
                                            </Button>
                                        </>
                                    )}

                                    {/* Show End/Cancel Period buttons if there IS an active cycle */}
                                    {activeCycleForSelectedDate && (
                                        <>
                                            {/* Only show End Period if cycle is not already ended */}
                                            {!activeCycleForSelectedDate.endDate && (
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="text-xs border-primary text-primary">End Period</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Confirm End Period</AlertDialogTitle></AlertDialogHeader>
                                                        <AlertDialogDescription>End your period on {format(selectedDate, 'MMMM d, yyyy')}? This will finalize the cycle length.</AlertDialogDescription>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleEndPeriod}>End Period</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" className="text-xs">Cancel Period</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Cancel Period</AlertDialogTitle></AlertDialogHeader>
                                                    <AlertDialogDescription>Permanently remove this period cycle ({format(parseISO(activeCycleForSelectedDate.startDate), 'MMM d')} - {activeCycleForSelectedDate.endDate ? format(parseISO(activeCycleForSelectedDate.endDate), 'MMM d') : 'Ongoing'}) and all its associated flow data?</AlertDialogDescription>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>No, Keep It</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleCancelPeriod}>Yes, Delete It</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Flow intensity buttons show if: 
              1. Period is active for this date OR 
              2. Period is completed for this date AND actual (non-spotting) flow was logged */ }
              {(activeCycleForSelectedDate && !activeCycleForSelectedDate.endDate) || (activeCycleForSelectedDate && activeCycleForSelectedDate.endDate && currentFlow && currentFlow.intensity !== 'spotting') && (
                <div className="flex flex-col items-center mb-3">
                  {/* Tooltip for past log days */}
                  {!!activeCycleForSelectedDate?.endDate && currentFlow && (
                    <div className="mb-1 text-xs text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline decoration-dotted cursor-help">Logged Flow</span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">This flow was logged for a past period. You can edit it, but cannot add new flow or start a period here.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant={currentFlow?.intensity === 'light' ? 'default' : 'outline'}
                      className={`period-status-btn flex items-center justify-center px-4 py-2 ${currentFlow?.intensity === 'light' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'}`}
                      onClick={() => recordFlow('light', selectedDate)}
                      style={{ minWidth: 56 }}
                      disabled={!currentFlow && !!activeCycleForSelectedDate?.endDate}
                    >
                      <span className="flex gap-1 items-center justify-center">
                        <DropletIcon className="h-5 w-5" fillOpacity={currentFlow?.intensity === 'light' ? 0.5 : 0} />
                      </span>
                    </Button>
                    <Button
                      variant={currentFlow?.intensity === 'medium' ? 'default' : 'outline'}
                      className={`period-status-btn flex items-center justify-center px-4 py-2 ${currentFlow?.intensity === 'medium' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'}`}
                      onClick={() => recordFlow('medium', selectedDate)}
                      style={{ minWidth: 56 }}
                      disabled={!currentFlow && !!activeCycleForSelectedDate?.endDate}
                    >
                      <span className="flex gap-1 items-center justify-center">
                        <DropletIcon className="h-5 w-5" fillOpacity={currentFlow?.intensity === 'medium' ? 0.5 : 0} />
                        <DropletIcon className="h-5 w-5" fillOpacity={currentFlow?.intensity === 'medium' ? 0.5 : 0} />
                      </span>
                    </Button>
                    <Button
                      variant={currentFlow?.intensity === 'heavy' ? 'default' : 'outline'}
                      className={`period-status-btn flex items-center justify-center px-4 py-2 ${currentFlow?.intensity === 'heavy' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'}`}
                      onClick={() => recordFlow('heavy', selectedDate)}
                      style={{ minWidth: 56 }}
                      disabled={!currentFlow && !!activeCycleForSelectedDate?.endDate}
                    >
                      <span className="flex gap-1 items-center justify-center">
                        <DropletIcon className="h-5 w-5" fillOpacity={currentFlow?.intensity === 'heavy' ? 0.5 : 0} />
                        <DropletIcon className="h-5 w-5" fillOpacity={currentFlow?.intensity === 'heavy' ? 0.5 : 0} />
                        <DropletIcon className="h-5 w-5" fillOpacity={currentFlow?.intensity === 'heavy' ? 0.5 : 0} />
                      </span>
                    </Button>
                  </div>
                </div>
              )}
              {!currentFlow && (
                <div className="text-sm text-muted-foreground mb-3 p-2 bg-muted/20 rounded">
                  Log spotting or use the "Start Period" button to begin tracking.
                </div>
              )}
            </div>
                        {/* === End Period Status Card === */}


                        {/* Mood Tracking */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Mood</h3>
                            <MoodSelector
                                currentMood={moodRecord?.mood}
                                onMoodSelect={recordMood}
                            />
                        </div>

                        {/* Cervical Mucus Tracking */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Cervical Mucus</h3>
                            <CervicalMucusSelector
                                currentType={cervicalMucusType}
                                onTypeSelect={recordCervicalMucus}
                            />
                        </div>

                        {/* Physical Symptoms */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Physical Symptoms</h3>
                            <SymptomsList
                                symptoms={physicalSymptoms}
                                activeSymptomIds={physicalSymptoms.filter((s: any) => isSymptomActive(s.id)).map((s: any) => s.id)}
                                onToggleSymptom={toggleSymptom}
                                getSymptomIntensity={getSymptomIntensity}
                                updateSymptomIntensity={updateSymptomIntensity}
                            />
                        </div>

                        {/* Emotional Symptoms */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Emotional Symptoms</h3>
                            <SymptomsList
                                symptoms={emotionalSymptoms}
                                activeSymptomIds={emotionalSymptoms.filter((s: any) => isSymptomActive(s.id)).map((s: any) => s.id)}
                                onToggleSymptom={toggleSymptom}
                                getSymptomIntensity={getSymptomIntensity}
                                updateSymptomIntensity={updateSymptomIntensity}
                            />
                        </div>

                        {/* PMDD Symptoms (Conditional) */}
                        {userSettings?.showPmddSymptoms && pmddSymptoms && pmddSymptoms.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center mb-2">
                                    <h3 className="text-lg font-semibold">PMDD Symptoms</h3>
                                    <div className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                                        PMDD
                                    </div>
                                </div>
                                <div className="p-3 mb-3 bg-muted/20 rounded-md text-sm text-muted-foreground">
                                    <p>Track symptoms typically severe during the luteal phase (before period) and improving shortly after menstruation starts.</p>
                                </div>
                                <SymptomsList
                                    symptoms={pmddSymptoms}
                                    activeSymptomIds={pmddSymptoms.filter((s: any) => isSymptomActive(s.id)).map((s: any) => s.id)}
                                    onToggleSymptom={toggleSymptom}
                                    getSymptomIntensity={getSymptomIntensity}
                                    updateSymptomIntensity={updateSymptomIntensity}
                                />
                            </div>
                        )}

                        {/* Medication Tracking */}
                        <div className="mb-6">
                            <MedicationTracker userId={userId} selectedDate={selectedDate} />
                        </div>

                        {/* Intimacy Section (Conditional) */}
                        {(userSettings?.showIntimacyCard ?? true) && ( // Default to show if setting is undefined
                            <Card className="mb-6">
                                <CardContent className="flex items-center justify-between py-2 px-3">
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Intimacy</span>
                                        {isIntimateLogged && (
                                            <span className="block text-xs mt-0.5 text-muted-foreground">Logged</span>
                                        )}
                                    </div>
                                    <IntimateActivityButton
                                        active={isIntimateLogged}
                                        onClick={logIntimateActivity}
                                        disabled={isIntimateLoading}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Notes Section */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Notes</h3>
                            <Textarea
                                className="h-24 bg-muted/20 border mb-2" // Slightly adjust style
                                placeholder="Add notes about your day..."
                                value={notes}
                                onChange={handleNotesChange}
                            />
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-center mt-4">
                            <Button
                                className="w-full max-w-sm"
                                size="lg"
                                onClick={handleSaveDailyEntry}
                            >
                                Save Daily Entry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Today;