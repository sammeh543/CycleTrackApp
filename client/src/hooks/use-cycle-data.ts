import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// --- UserSettings interface for user settings shape ---
export interface UserSettings {
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  // Add other settings as needed
}

import { queryClient, apiRequest } from '@/lib/queryClient';
import { addDays, format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getCyclePhase, isInFertileWindow } from '@/lib/cycle-utils';

interface CycleData {
  id: number;
  userId: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

interface FlowRecord {
  id: number;
  userId: number;
  cycleId?: number;
  date: string;
  intensity: 'spotting' | 'light' | 'medium' | 'heavy';
}

interface UseCycleDataProps {
  userId: number;
}

export function useCycleData({ userId }: UseCycleDataProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Fetch all cycles
  const { 
    data: cycles,
    isLoading: cyclesLoading,
    error: cyclesError,
    refetch: refetchCycles
  } = useQuery<CycleData[]>({
    queryKey: [`/api/cycles?userId=${userId}`],
    enabled: !!userId
  });
  
  // Fetch current cycle
  const { 
    data: currentCycle,
    isLoading: currentCycleLoading,
    refetch: refetchCurrentCycle
  } = useQuery<CycleData | null>({
    queryKey: [`/api/cycles/current?userId=${userId}`],
    enabled: !!userId
  });
  
  // Fetch flow records
  const {
    data: flowRecords,
    isLoading: flowRecordsLoading,
    refetch: refetchFlowRecords
  } = useQuery<FlowRecord[]>({
    queryKey: [`/api/flow-records?userId=${userId}`],
    enabled: !!userId
  });
  
  // Fetch symptom records
  const {
    data: symptomRecords,
    isLoading: symptomRecordsLoading
  } = useQuery({
    queryKey: [`/api/symptom-records?userId=${userId}`],
    enabled: !!userId
  });
  
  // Fetch mood records
  const {
    data: moodRecords,
    isLoading: moodRecordsLoading
  } = useQuery({
    queryKey: [`/api/mood-records?userId=${userId}`],
    enabled: !!userId
  });

  // Fetch cervical mucus records
  const {
    data: cervicalMucusRecords,
    isLoading: cervicalMucusRecordsLoading
  } = useQuery({
    queryKey: [`/api/cervical-mucus-records?userId=${userId}`],
    enabled: !!userId && false // Temporarily disable until UI is ready
  });
  
  // Fetch all symptoms
  const {
    data: symptoms,
    isLoading: symptomsLoading
  } = useQuery({
    queryKey: [`/api/user-symptoms?userId=${userId}`],
    enabled: !!userId
  });
  
  // Fetch user settings
  const {
    data: userSettings,
    isLoading: userSettingsLoading
  } = useQuery<UserSettings>({
    queryKey: [`/api/user-settings/${userId}`],
    enabled: !!userId
  });
  
  // Calculate cycle day for the selected date
  const getCycleDay = useCallback(() => {
    if (!currentCycle) return null;
    
    const cycleStartDate = parseISO(currentCycle.startDate);
    
    // Calculate the difference in days
    const dayDiff = Math.floor(
      (selectedDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1; // Add 1 to include the start day
    
    return dayDiff > 0 ? dayDiff : null;
  }, [currentCycle, selectedDate]);
  
  // Get flow record for a specific date
  const getFlowForDate = useCallback((date: Date) => {
    if (!flowRecords) return null;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return flowRecords.find(record => record.date.split('T')[0] === dateStr);
  }, [flowRecords]);
  
  // Mutations for updating data
  const createCycleMutation = useMutation({
    mutationFn: (newCycle: Omit<CycleData, 'id'>) => {
      return apiRequest('POST', '/api/cycles', newCycle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
      toast({
        title: "Success",
        description: "Period cycle started",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start period cycle",
        variant: "destructive",
      });
      console.error(error);
    }
  });
  
  const updateCycleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<CycleData> }) => {
      return apiRequest('PATCH', `/api/cycles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
      toast({
        title: "Success",
        description: "Period cycle updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update period cycle",
        variant: "destructive",
      });
      console.error(error);
    }
  });
  
  const recordFlowMutation = useMutation({
    mutationFn: (data: { userId: number; cycleId?: number; date: string; intensity: string }) => {
      return apiRequest('POST', '/api/flow-records', data);
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: [`/api/flow-records?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
      
      // Force refetch to update UI immediately
      refetchFlowRecords();
      refetchCycles();
      refetchCurrentCycle();
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to save flow record", variant: "destructive" });
      console.error(error);
    }
  });
  
  const deleteFlowMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/flow-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/flow-records?userId=${userId}`] });
      refetchFlowRecords();
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to remove flow record", variant: "destructive" });
      console.error(error);
    }
  });

  // Helper function to start a new cycle
  const startPeriod = useCallback((date: Date = new Date()) => {
    createCycleMutation.mutate({
      userId,
      startDate: format(date, 'yyyy-MM-dd')
    }, {
      onSuccess: () => {
        // Explicitly refetch current cycle to ensure UI updates
        refetchCurrentCycle();
        refetchCycles();
        
        // Also invalidate all cycle-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/cycles/current'] });
      }
    });
  }, [createCycleMutation, userId, refetchCurrentCycle, refetchCycles, queryClient]);
  
  // Helper function to end the current cycle
  const endPeriod = useCallback((date: Date = new Date(), cycleId?: number) => {
    // If cycleId is provided, use it; otherwise use the current cycle's ID
    const targetCycleId = cycleId || currentCycle?.id;
    
    if (!targetCycleId) return;
    
    updateCycleMutation.mutate({
      id: targetCycleId,
      data: {
        endDate: format(date, 'yyyy-MM-dd')
      }
    }, {
      onSuccess: () => {
        // Explicitly refetch to ensure UI updates
        refetchCurrentCycle();
        refetchCycles();
        
        // Also invalidate all cycle-related queries
        queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
        
        toast({
          title: "Success",
          description: "Period cycle ended",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to end period cycle",
          variant: "destructive",
        });
        console.error("Error ending period:", error);
      }
    });
  }, [currentCycle, updateCycleMutation, refetchCurrentCycle, refetchCycles, queryClient, userId]);
  
  // Helper function to record flow intensity or remove flow record if the same intensity is clicked again
  const recordFlow = useCallback((intensity: 'spotting' | 'light' | 'medium' | 'heavy', date?: Date) => {
    const dateToUse = date || selectedDate;
    const formattedDate = format(dateToUse, 'yyyy-MM-dd');
    const existingFlow = flowRecords?.find(r => r.date.split('T')[0] === formattedDate);
    
    // If the same intensity is clicked again, delete the flow record (toggle behavior)
    if (existingFlow && existingFlow.intensity === intensity) {
      deleteFlowMutation.mutate(existingFlow.id);
    } else {
      // Otherwise create or update the flow record
      recordFlowMutation.mutate({ 
        userId, 
        cycleId: currentCycle?.id, 
        date: formattedDate, 
        intensity 
      });
    }
  }, [recordFlowMutation, deleteFlowMutation, userId, currentCycle, selectedDate, flowRecords]);
  
  // Helper function to cancel/delete a cycle
  const cancelPeriod = useCallback((cycleId: number) => {
    if (!cycleId) return;

    // Find the cycle to get its start date
    const cycle = cycles?.find(c => c.id === cycleId);
    if (!cycle) return;
    const startDate = cycle.startDate;

    // Delete all flow records from the cycle's start date onward
    const flowRecordsToDelete = (flowRecords || []).filter(record => record.cycleId === cycleId || record.date >= startDate);
    const deletePromises = flowRecordsToDelete.map(record => apiRequest('DELETE', `/api/flow-records/${record.id}`));

    Promise.all(deletePromises)
      .then(() => {
        // Delete the cycle itself
        return apiRequest('DELETE', `/api/cycles/${cycleId}`);
      })
      .then(() => {
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/flow-records?userId=${userId}`] });

        // Force refetch to update UI immediately
        refetchCycles();
        refetchCurrentCycle();
        refetchFlowRecords();

        toast({ 
          title: "Period cancelled", 
          description: "The period and all associated flow records have been removed from your records", 
          variant: "default" 
        });
      })
      .catch(error => {
        toast({ 
          title: "Error", 
          description: "Failed to cancel period and remove flow records", 
          variant: "destructive" 
        });
        console.error(error);
      });
  }, [userId, cycles, flowRecords, refetchCycles, refetchCurrentCycle, refetchFlowRecords, queryClient, toast]);
  
  // Calculate average cycle length
  const getAverageCycleLength = useCallback(() => {
    if (!cycles || cycles.length < 2) return 28; // Default to 28 days
    
    let totalDays = 0;
    let count = 0;
    
    // Sort cycles by start date (newest first)
    const sortedCycles = [...cycles].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    
    for (let i = 0; i < sortedCycles.length - 1; i++) {
      const currentStart = new Date(sortedCycles[i].startDate);
      const nextStart = new Date(sortedCycles[i + 1].startDate);
      
      const daysDiff = Math.round(
        (currentStart.getTime() - nextStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff > 0) {
        totalDays += daysDiff;
        count++;
      }
    }
    
    return count > 0 ? Math.round(totalDays / count) : 28;
  }, [cycles]);
  
  // Get the most recent period start date
  const getLastPeriodStartDate = useCallback(() => {
    if (!flowRecords || flowRecords.length === 0) return null;
    
    // Sort flow records by date (newest first)
    const sortedFlowRecords = [...flowRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Find records that are either the first day of a period or isolated spotting
    const periodStartRecords = sortedFlowRecords.filter(record => {
      const recordDate = new Date(record.date);
      const oneDayBefore = new Date(recordDate);
      oneDayBefore.setDate(recordDate.getDate() - 1);
      
      // Check if there's no flow record for the day before
      const hasFlowOnDayBefore = sortedFlowRecords.some(r => {
        const rDate = new Date(r.date);
        return rDate.getFullYear() === oneDayBefore.getFullYear() &&
               rDate.getMonth() === oneDayBefore.getMonth() &&
               rDate.getDate() === oneDayBefore.getDate();
      });
      
      return !hasFlowOnDayBefore;
    });
    
    if (periodStartRecords.length === 0) return null;
    return new Date(periodStartRecords[0].date);
  }, [flowRecords]);
  
  // Calculate prediction for next period
  const predictNextPeriod = useCallback(() => {
    // Use currentCycle if available
    if (currentCycle) {
      const averageCycleLength = getAverageCycleLength();
      const startDate = parseISO(currentCycle.startDate);
      return addDays(startDate, averageCycleLength);
    }
    
    // If there's no current cycle, try using the last flow record
    const lastPeriodStart = getLastPeriodStartDate();
    if (lastPeriodStart) {
      const averageCycleLength = getAverageCycleLength();
      return addDays(lastPeriodStart, averageCycleLength);
    }
    
    // If we have flowRecords but no current cycle, use the most recent flow record
    if (flowRecords && flowRecords.length > 0) {
      const sortedFlowRecords = [...flowRecords]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const mostRecentFlowDate = parseISO(sortedFlowRecords[0].date);
      const averageCycleLength = getAverageCycleLength();
      return addDays(mostRecentFlowDate, averageCycleLength);
    }
    
    return null;
  }, [currentCycle, getAverageCycleLength, getLastPeriodStartDate, flowRecords]);
  
  // Get cycle phase for the selected date
  const getCyclePhaseForDate = useCallback((date: Date = selectedDate) => {
    const lastPeriodStart = getLastPeriodStartDate();
    if (!lastPeriodStart) return 'Unknown';
    
    const avgCycleLength = getAverageCycleLength();
    return getCyclePhase(date, lastPeriodStart, avgCycleLength);
  }, [getLastPeriodStartDate, getAverageCycleLength, selectedDate]);
  
  // Check if the selected date is in the fertile window
  const isInFertileWindowForDate = useCallback((date: Date = selectedDate) => {
    const lastPeriodStart = getLastPeriodStartDate();
    if (!lastPeriodStart) return false;
    
    const avgCycleLength = getAverageCycleLength();
    return isInFertileWindow(date, lastPeriodStart, avgCycleLength);
  }, [getLastPeriodStartDate, getAverageCycleLength, selectedDate]);
  
  return {
    selectedDate,
    setSelectedDate,
    cycles,
    currentCycle,
    cycleDay: getCycleDay(),
    cyclePhase: getCyclePhaseForDate(),
    isInFertileWindow: isInFertileWindowForDate(),
    flowRecords,
    currentFlow: getFlowForDate(selectedDate),
    symptomRecords,
    moodRecords,
    cervicalMucusRecords,
    symptoms,
    userSettings,
    isLoading: cyclesLoading || currentCycleLoading || flowRecordsLoading || symptomRecordsLoading || moodRecordsLoading || cervicalMucusRecordsLoading || symptomsLoading || userSettingsLoading,
    error: cyclesError,
    startPeriod,
    endPeriod,
    cancelPeriod,
    recordFlow,
    refetchCurrentCycle,
    refetchCycles,
    getCyclePhaseForDate,
    isInFertileWindowForDate,
    predictNextPeriod,
    getAverageCycleLength
  };
}
