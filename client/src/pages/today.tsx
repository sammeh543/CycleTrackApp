import React, { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO, isSameDay, isBefore, isAfter } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Droplet, CheckCircle2, Circle } from 'lucide-react';
import SymptomsList from '@/components/symptoms/symptoms-list';
import MoodSelector from '@/components/symptoms/mood-selector';
import CervicalMucusSelector from '@/components/symptoms/cervical-mucus-selector';
import DateNav from '@/components/date-nav';
import MedicationTracker from '@/components/medications/medication-tracker';
import { useCycleData } from '@/hooks/use-cycle-data';
import { useSymptoms } from '@/hooks/use-symptoms';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TodayProps {
  userId: number;
}

const Today: React.FC<TodayProps> = ({ userId }) => {
  const [notes, setNotes] = useState('');
  const [location] = useLocation();
  
  // Parse date from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const dateParam = urlParams.get('date');
  
  // Initialize selectedDate with URL param or current date
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateParam) {
      try {
        return parseISO(dateParam);
      } catch (e) {
        console.error("Invalid date parameter:", dateParam);
        return new Date();
      }
    }
    return new Date();
  });
  
  const { 
    selectedDate: cycleSelectedDate,
    setSelectedDate: setCycleSelectedDate,
    cycles,
    currentCycle,
    cycleDay,
    cyclePhase,
    isInFertileWindow,
    currentFlow,
    isLoading: cycleLoading,
    startPeriod,
    endPeriod,
    cancelPeriod,
    recordFlow,
    refetchCycles
  } = useCycleData({ userId });
  
  // Get cycle for the selected date
  const getCycleForSelectedDate = useCallback(() => {
    if (!cycles) return null;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Find any cycle that starts on or before the selected date and either has no end date
    // or ends on or after the selected date
    return cycles.find(cycle => {
      const cycleStartDate = parseISO(cycle.startDate);
      const cycleEndDate = cycle.endDate ? parseISO(cycle.endDate) : null;
      
      const isStartOnOrBeforeSelectedDate = isSameDay(cycleStartDate, selectedDate) || 
                                          isBefore(cycleStartDate, selectedDate);
      
      const isEndOnOrAfterSelectedDate = !cycleEndDate || 
                                        isSameDay(cycleEndDate, selectedDate) || 
                                        isAfter(cycleEndDate, selectedDate);
      
      return isStartOnOrBeforeSelectedDate && isEndOnOrAfterSelectedDate;
    });
  }, [cycles, selectedDate]);

  // Active cycle for the selected date
  const activeCycleForSelectedDate = getCycleForSelectedDate();
  
  // Keep the dates in sync between components
  useEffect(() => {
    setCycleSelectedDate(selectedDate);
    // Force refetch when selected date changes to ensure we have the latest data
    refetchCycles();
  }, [selectedDate, setCycleSelectedDate, refetchCycles]);
  
  // Fetch user settings for PMDD toggle
  const { data: settings } = useQuery<{ showPmddSymptoms?: boolean }>({
    queryKey: [`/api/user-settings/${userId}`],
    enabled: userId > 0,
  });

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
  } = useSymptoms({ userId, date: selectedDate, showPmddSymptoms: settings?.showPmddSymptoms ?? true });
  
  // Initialize notes from dailyNote when available
  useEffect(() => {
    if (dailyNote?.notes) {
      setNotes(dailyNote.notes);
    } else {
      setNotes(''); // Clear notes when changing to a date with no notes
    }
  }, [dailyNote]);
  
  // Save notes when user edits
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };
  
  const { toast } = useToast();
  
  // Save all daily data
  const handleSaveNotes = () => {
    // Save daily notes
    saveDailyNote(notes);
    
    // Show confirmation to user
    toast({
      title: "Entry Saved",
      description: `Your daily entry for ${format(selectedDate, 'MMMM d, yyyy')} has been saved.`,
      duration: 3000,
    });
  };
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };
  
  const isLoading = cycleLoading || symptomsLoading;
  
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
  
  return (
    <div className="tab-content px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{isToday(selectedDate) ? 'Today' : 'Day View'}</h2>
        <Card>
          <CardContent className="p-4">
            <DateNav 
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              userId={userId}
            />
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-2 mb-2">
              {cycleDay !== null && (
                <div className="text-sm px-3 py-1 rounded-full bg-primary period-status-label">
                  Cycle Day {cycleDay}
                </div>
              )}
              {!cycleLoading && (
                <div className={`text-sm px-3 py-1 rounded-full 
                  ${cyclePhase === 'period' ? 'bg-red-400/90 period-status-label' : 
                    cyclePhase === 'follicular' ? 'bg-yellow-400/90 period-status-label' : 
                    cyclePhase === 'ovulation' ? 'bg-blue-400/90 period-status-label' : 
                    cyclePhase === 'luteal' ? 'bg-purple-400/90 period-status-label' : 
                    'bg-muted text-muted-foreground'}`}>
                  {cyclePhase !== 'Unknown' ? `${cyclePhase.charAt(0).toUpperCase() + cyclePhase.slice(1)} Phase` : 'Phase Unknown'}
                </div>
              )}
              {isInFertileWindow && (
                <div className="text-sm px-3 py-1 rounded-full bg-blue-500 period-status-label flex items-center">
                  <span className="inline-block w-2 h-2 bg-white rounded-full mr-1"></span>
                  Fertile Window
                </div>
              )}
            </div>
            
            {/* Phase Description */}
            {!cycleLoading && cyclePhase !== 'Unknown' && (
              <div className="mb-4 p-3 rounded-md text-sm bg-muted/40">
                {cyclePhase === 'period' && (
                  <p>Menstrual phase (Days 1-5): Your period. Estrogen and progesterone levels are low.</p>
                )}
                {cyclePhase === 'follicular' && (
                  <p>Follicular phase (Days 6-13): Estrogen levels rise as follicles grow. Your body prepares for ovulation.</p>
                )}
                {cyclePhase === 'ovulation' && (
                  <p>Ovulation phase (Day 14): An egg is released from the ovary. Fertility is at its highest.</p>
                )}
                {cyclePhase === 'luteal' && (
                  <p>Luteal phase (Days 15-28): Progesterone rises. Your body prepares for possible pregnancy or next period.</p>
                )}
              </div>
            )}
            
            {/* Period Status Card */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Period Status</h3>
                {/* Show period buttons on any date, not just today */}
                {(
                  <>
                  {activeCycleForSelectedDate && !activeCycleForSelectedDate.endDate && (
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs border-primary text-primary"
                          >
                            End Period
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm End Period</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogDescription>
                            Are you sure you want to end your period? This will update your cycle data.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => endPeriod(selectedDate, activeCycleForSelectedDate?.id)}>End Period</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="text-xs"
                          >
                            Cancel Period
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Period</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this period? This will remove all data for this cycle.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelPeriod(activeCycleForSelectedDate.id)}>Yes, Delete It</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                  {(!activeCycleForSelectedDate || (activeCycleForSelectedDate && activeCycleForSelectedDate.endDate)) && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => {
                        startPeriod(selectedDate);
                        // Also record flow as light by default
                        setTimeout(() => recordFlow('light', selectedDate), 300);
                      }}
                    >
                      Start Period
                    </Button>
                  )}
                  </>
                )}
              </div>
              {/* Always show flow options to allow logging spotting outside of periods */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Button 
                  variant={currentFlow?.intensity === 'spotting' ? 'default' : 'outline'}
                  className={`justify-center period-status-btn ${currentFlow?.intensity === 'spotting' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'} `}
                  onClick={() => recordFlow('spotting', selectedDate)}
                >
                  <Droplet className="mr-1 h-4 w-4 period-status-label" fillOpacity={currentFlow?.intensity === 'spotting' ? 0.3 : 0} />
                  <span className="period-status-label">Spotting</span>
                </Button>
                <Button 
                  variant={currentFlow?.intensity === 'light' ? 'default' : 'outline'}
                  className={`justify-center period-status-btn ${currentFlow?.intensity === 'light' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'} `}
                  onClick={() => recordFlow('light', selectedDate)}
                >
                  <Droplet className="mr-1 h-4 w-4 period-status-label" fillOpacity={currentFlow?.intensity === 'light' ? 0.5 : 0} />
                  <span className="period-status-label">Light</span>
                </Button>
                <Button 
                  variant={currentFlow?.intensity === 'medium' ? 'default' : 'outline'}
                  className={`justify-center period-status-btn ${currentFlow?.intensity === 'medium' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'} `}
                  onClick={() => recordFlow('medium', selectedDate)}
                >
                  <Droplet className="mr-1 h-4 w-4 period-status-label" fill={currentFlow?.intensity === 'medium' ? 'currentColor' : 'none'} />
                  <span className="period-status-label">Medium</span>
                </Button>
                <Button 
                  variant={currentFlow?.intensity === 'heavy' ? 'default' : 'outline'}
                  className={`justify-center period-status-btn ${currentFlow?.intensity === 'heavy' ? 'bg-primary selected' : 'bg-primary/20 hover:bg-primary/30 border-primary'} `}
                  onClick={() => recordFlow('heavy', selectedDate)}
                >
                  <Droplet className="mr-1 h-4 w-4 period-status-label" fill={currentFlow?.intensity === 'heavy' ? 'currentColor' : 'none'} />
                  <span className="period-status-label">Heavy</span>
                </Button>
              </div>
              {!currentFlow && (
                <div className="text-sm text-muted-foreground mb-3 p-2 bg-muted/20 rounded">
                  No period data for this date. Use the "Start Period" button to begin tracking.
                </div>
              )}
            </div>
            
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
              <div>
                <CervicalMucusSelector
                  currentType={cervicalMucusType}
                  onTypeSelect={recordCervicalMucus}
                />
              </div>
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
            
            {/* PMDD Symptoms */}
            {pmddSymptoms && pmddSymptoms.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <h3 className="text-lg font-semibold">PMDD Symptoms</h3>
                  <div className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                    Premenstrual Dysphoric Disorder
                  </div>
                </div>
                <div className="p-3 mb-3 bg-muted/20 rounded-md text-sm text-muted-foreground">
                  <p>Track symptoms that are severe during the luteal phase (7-14 days before period) and improve within a few days of menstruation.</p>
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
            
            {/* Notes Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <Textarea 
                className="h-24 bg-muted bg-opacity-40 border-border mb-2"
                placeholder="Add notes about your day..."
                value={notes}
                onChange={handleNotesChange}
              />
            </div>
            
            {/* Save Button */}
            <div className="flex justify-center">
              <Button 
                className="w-full max-w-sm" 
                size="lg"
                onClick={handleSaveNotes}
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
