import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // <-- Added useQueryClient import

// --- UserSettings interface for user settings shape ---
export interface UserSettings {
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  // Add other settings as needed
}

import { apiRequest } from '@/lib/queryClient'; // <-- Keep original apiRequest import
import { addDays, format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // <-- Keep useToast import
import { getCyclePhase, isInFertileWindow, getBestCyclePredictionLengths, getExpectedPeriodDays, getAutoLogLightDays, getDaysToRemoveBetweenPeriods } from '@/lib/cycle-utils';

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
  const { toast } = useToast(); // <-- Initialize toast
  const queryClient = useQueryClient(); // <-- Initialize queryClient
  const [selectedDate, setSelectedDate] = useState(new Date());

  // --- Keep all existing useQuery calls ---
  const {
    data: cycles,
    isLoading: cyclesLoading,
    error: cyclesError,
    refetch: refetchCycles
  } = useQuery<CycleData[]>({
    queryKey: [`/api/cycles?userId=${userId}`],
    enabled: !!userId
  });

  const {
    data: currentCycle,
    isLoading: currentCycleLoading,
    refetch: refetchCurrentCycle
  } = useQuery<CycleData | null>({
    queryKey: [`/api/cycles/current?userId=${userId}`],
    enabled: !!userId
  });

  const {
    data: flowRecords,
    isLoading: flowRecordsLoading,
    refetch: refetchFlowRecords
  } = useQuery<FlowRecord[]>({
    queryKey: [`/api/flow-records?userId=${userId}`],
    enabled: !!userId
  });

  const {
    data: symptomRecords,
    isLoading: symptomRecordsLoading
  } = useQuery({
    queryKey: [`/api/symptom-records?userId=${userId}`],
    enabled: !!userId
  });

  const {
    data: moodRecords,
    isLoading: moodRecordsLoading
  } = useQuery({
    queryKey: [`/api/mood-records?userId=${userId}`],
    enabled: !!userId
  });

  const {
    data: cervicalMucusRecords,
    isLoading: cervicalMucusRecordsLoading
  } = useQuery({
    queryKey: [`/api/cervical-mucus-records?userId=${userId}`],
    enabled: !!userId && false
  });

  const {
    data: symptoms,
    isLoading: symptomsLoading
  } = useQuery({
    queryKey: [`/api/user-symptoms?userId=${userId}`],
    enabled: !!userId
  });

  const {
    data: userSettings,
    isLoading: userSettingsLoading
  } = useQuery<UserSettings>({
    queryKey: [`/api/user-settings/${userId}`],
    enabled: !!userId
  });

  // Calculate cycle day for selected date
  const getCycleDay = useCallback(() => {
    if (!currentCycle) return null;
    const cycleStartDate = parseISO(currentCycle.startDate);
    // Calculate day difference in days
    const dayDiff = Math.floor(
      (selectedDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1; // Add 1 to include the start day
    return dayDiff > 0 ? dayDiff : null;
  }, [currentCycle, selectedDate]);

  // Get flow record for selected date
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
    onSuccess: (response: Response /* Adjust type if apiRequest returns differently */) => {
       // --- Keep onSuccess logic here ---
       queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
       queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
       toast({ title: "Success", description: "Period cycle started" });

       // The logic to handle response and call autoLogLightFlow
       async function handleSuccess() {
            let createdCycle: CycleData;
            try {
              // Try parsing only if response looks ok and has body
              if (response.ok && response.headers.get('content-length') !== '0') {
                  createdCycle = await response.json();
                   // Auto-log 'light' for period window only if cycle created successfully
                  if (createdCycle && flowRecords && userSettings) {
                     autoLogLightFlow(
                         { ...createdCycle }, // Pass the newly created cycle
                         flowRecords,
                         userSettings
                     );
                 }
              } else {
                  console.warn("Cycle creation response was not OK or empty, skipping auto-log.");
              }
            } catch (e) {
                console.error("Error parsing create cycle response:", e);
                // Fallback: maybe still invalidate/refetch even if parsing fails
            } finally {
                // Explicitly refetch AFTER potential autoLog to ensure UI shows everything
                refetchCurrentCycle();
                refetchCycles();
                refetchFlowRecords(); // Also refetch flow records if autoLog happened
            }
       }
       handleSuccess(); // Call the async handler
    },
    onError: (error) => {
        // --- Keep onError logic here ---
        toast({ title: "Error", description: "Failed to start period cycle", variant: "destructive" });
        console.error(error);
    }
  });

  const updateCycleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<CycleData> }) => {
      return apiRequest('PATCH', `/api/cycles/${id}`, data);
    },
    onSuccess: () => {
      // --- Keep onSuccess logic here ---
      queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
      toast({ title: "Success", description: "Period cycle updated" });
      // Consider refetching if needed for immediate UI consistency after update
      refetchCycles();
      refetchCurrentCycle();
    },
    onError: (error) => {
      // --- Keep onError logic here ---
      toast({ title: "Error", description: "Failed to update period cycle", variant: "destructive" });
      console.error(error);
    }
  });

  const recordFlowMutation = useMutation({
    mutationFn: (data: { userId: number; cycleId?: number; date: string; intensity: string }) => {
      return apiRequest('POST', '/api/flow-records', data);
    },
    onSuccess: () => {
      // --- Keep onSuccess logic here ---
      queryClient.invalidateQueries({ queryKey: [`/api/flow-records?userId=${userId}`] });
      // Maybe invalidate cycles too if flow affects cycle calculations -- not needed for now
      // queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
      // queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });

      // Force refetch to update UI immediately
      refetchFlowRecords();
      // refetchCycles(); // Only if needed
      // refetchCurrentCycle(); // Only if needed
    },
    onError: (error) => {
      // --- Keep onError logic here ---
      toast({ title: "Error", description: "Failed to save flow record", variant: "destructive" });
      console.error(error);
    }
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/flow-records/${id}`);
    },
    onSuccess: () => {
      // --- Keep onSuccess logic here ---
      queryClient.invalidateQueries({ queryKey: [`/api/flow-records?userId=${userId}`] });
      refetchFlowRecords();
    },
    onError: (error) => {
      // --- Keep onError logic here ---
      if (error && error.message && error.message.includes("404")) {
        console.warn("Flow record already deleted (404), ignoring.");
        return;
      }
      toast({ title: "Error", description: "Failed to remove flow record", variant: "destructive" });
      console.error(error);
    }
  });

  // --- Helper autolog callbacks (autoLogLightFlow, removeAutoLoggedLightAfterEnd, removeAllBetweenEndAndNextStart) ---
  const autoLogLightFlow = useCallback((cycle: CycleData, currentFlowRecords: FlowRecord[], currentUserSettings?: UserSettings) => {
    if (!cycle || !currentFlowRecords) return; // Add null checks
    const { avgPeriodLength } = getBestCyclePredictionLengths(currentFlowRecords, currentUserSettings);
    const { toLog } = getAutoLogLightDays(
      cycle.startDate,
      cycle.endDate,
      avgPeriodLength,
      currentFlowRecords
    );
    // Log 'light' for all missing days in the period window
    toLog.forEach(dateStr => {
      // Check if a record for this day already exists before mutating
      const existing = currentFlowRecords.find(r => r.date.split('T')[0] === dateStr);
      if (!existing) {
        console.log(`Auto-logging light flow for ${dateStr} in cycle ${cycle.id}`);
        recordFlowMutation.mutate({
          userId: cycle.userId,
          cycleId: cycle.id,
          date: dateStr,
          intensity: 'light'
        });
      }
    });
  }, [recordFlowMutation]); // Dependency: only needs the mutation function

  // Remove 'light' flow records after the end date of the cycle
  const removeAutoLoggedLightAfterEnd = useCallback((cycle: CycleData, currentFlowRecords: FlowRecord[], currentUserSettings?: UserSettings) => {
     if (!cycle || !cycle.endDate || !currentFlowRecords) return; // Add null checks
    const { avgPeriodLength } = getBestCyclePredictionLengths(currentFlowRecords, currentUserSettings);
    const { toRemove } = getAutoLogLightDays(
      cycle.startDate,
      cycle.endDate, // Pass endDate here
      avgPeriodLength,
      currentFlowRecords
    );
    // Remove 'light' flow records after the end date of the cycle
    toRemove.forEach(dateStr => {
      const rec = currentFlowRecords.find(r => r.date.split('T')[0] === dateStr && r.intensity === 'light');
      if (rec) {
          console.log(`Removing auto-logged light flow for ${dateStr} after end date ${cycle.endDate}`);
          deleteFlowMutation.mutate(rec.id);
      }
    });
  }, [deleteFlowMutation]); // Dependency: only needs the mutation function

  const removeAllBetweenEndAndNextStart = useCallback((cycle: CycleData, allCycles: CycleData[], currentFlowRecords: FlowRecord[]) => {
      if (!cycle || !cycle.endDate || !allCycles || !currentFlowRecords) return; // Add null checks
    const thisEnd = cycle.endDate;
    const nextCycle = allCycles
      .filter(c => c.id !== cycle.id && c.startDate && parseISO(c.startDate) > parseISO(thisEnd))
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0];
    const nextStart = nextCycle ? nextCycle.startDate : undefined;
    const toRemove = getDaysToRemoveBetweenPeriods(thisEnd, nextStart, currentFlowRecords);

    toRemove.forEach(dateStr => {
      const rec = currentFlowRecords.find(r => r.date.split('T')[0] === dateStr && r.intensity !== 'spotting');
      if (rec) {
          console.log(`Removing flow record ${rec.id} (${rec.intensity}) for date ${dateStr} between end ${thisEnd} and next start ${nextStart}`);
          deleteFlowMutation.mutate(rec.id);
      }
    });
  }, [deleteFlowMutation]); // Dependency: only needs the mutation function


  // Helper function to convert any "spotting" to "light" when starting a period
  const convertSpottingToLight = useCallback(async (date: Date) => {
    if (!flowRecords) return;

    // Format date to match the format in records
    const dateStr = format(date, 'yyyy-MM-dd');

    // Find any existing spotting record for this date
    const spottingRecord = flowRecords.find(
      r => r.date.split('T')[0] === dateStr && r.intensity === 'spotting'
    );

    // If a spotting record exists, convert it to light
    if (spottingRecord) {
      console.log(`Converting spotting to light for ${dateStr} (ID: ${spottingRecord.id})`);

      // First delete the spotting record
      await deleteFlowMutation.mutateAsync(spottingRecord.id);

      // Then create a new light record for the same date
      await recordFlowMutation.mutateAsync({
        userId,
        date: dateStr,
        intensity: 'light',
        cycleId: spottingRecord.cycleId // Preserve the cycle ID if it exists
      });

      // Refresh flow records to get the latest data
      await refetchFlowRecords();
    }
  }, [flowRecords, deleteFlowMutation, recordFlowMutation, userId, refetchFlowRecords]);

  // --- Keep startPeriod and endPeriod (make sure they use the updated helpers correctly) ---
  const startPeriod = useCallback((date: Date = new Date()) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log(`Attempting to start period on ${formattedDate}`);
      createCycleMutation.mutate({
          userId,
          startDate: formattedDate
      } /* onSuccess is handled within the mutation definition */);
  }, [createCycleMutation, userId]); // Dependencies might include other state if needed inside

  const endPeriod = useCallback((date: Date = new Date(), cycleId?: number) => {
    const targetCycleId = cycleId || currentCycle?.id;
    if (!targetCycleId) {
        console.warn("endPeriod called without a valid cycle ID.");
        return;
    }

    const targetCycle = cycles?.find(c => c.id === targetCycleId); // Prefer finding in all cycles
    if (!targetCycle) {
        console.warn(`endPeriod could not find cycle with ID ${targetCycleId}.`);
        return;
    }

    const formattedEndDate = format(date, 'yyyy-MM-dd');
    console.log(`Attempting to end period ${targetCycleId} on ${formattedEndDate}`);

    updateCycleMutation.mutate({
      id: targetCycleId,
      data: { endDate: formattedEndDate }
    }, {
      onSuccess: () => {
        // Fetch fresh data AFTER mutation succeeds
        Promise.all([refetchCycles(), refetchFlowRecords()]).then(([cyclesResult, flowResult]) => {
            const latestCycles = cyclesResult.data || [];
            const latestFlowRecords = flowResult.data || [];
            const updatedCycle = latestCycles.find(c => c.id === targetCycleId);

            if (updatedCycle && updatedCycle.endDate) { // Ensure cycle was actually updated
                console.log(`Cycle ${targetCycleId} ended. Running cleanup/fill logic.`);
                 // Auto-fill/remove logic using the FRESH data
                 if (latestFlowRecords && userSettings) {
                    autoLogLightFlow(updatedCycle, latestFlowRecords, userSettings);
                    removeAutoLoggedLightAfterEnd(updatedCycle, latestFlowRecords, userSettings);
                }
                 // Remove flow between periods using FRESH data
                 if (latestCycles && latestFlowRecords) {
                    removeAllBetweenEndAndNextStart(updatedCycle, latestCycles, latestFlowRecords);
                }
             } else {
                 console.warn(`Cycle ${targetCycleId} not found or endDate not set after update mutation success.`);
             }

             // Refetch current cycle state as well
             refetchCurrentCycle();

             toast({ title: "Success", description: "Period cycle ended" });

         }).catch(err => {
             console.error("Error refetching data after ending period:", err);
             toast({ title: "Warning", description: "Period ended, but UI might need manual refresh.", variant: "destructive" });
         });
      },
      onError: (error) => {
        // Error handling remains the same
        toast({ title: "Error", description: "Failed to end period cycle", variant: "destructive" });
        console.error("Error ending period:", error);
      }
    });
  }, [
      currentCycle?.id, // Use currentCycle.id as a dependency for default case
      cycles, // Need all cycles to find the target
      updateCycleMutation,
      refetchCycles,
      refetchFlowRecords, // Need to refetch flow records for helpers
      refetchCurrentCycle,
      userSettings, // Needed for helpers
      autoLogLightFlow, // Helpers are dependencies
      removeAutoLoggedLightAfterEnd,
      removeAllBetweenEndAndNextStart,
      toast
  ]); // Add necessary dependencies


  // ==================================================================
  // ===== THIS IS THE REPLACED/CORRECTED cancelPeriod FUNCTION =====
  // ==================================================================
  const cancelPeriod = useCallback((cycleId: number) => {
    if (!cycleId) {
      console.warn('cancelPeriod called with invalid cycleId');
      return;
    }
    console.log(`Attempting to cancel period cycle ${cycleId}`);

    // Filter flow records PRECISELY before sending delete requests
    // Uses the flowRecords state directly available in the hook's scope
    const flowRecordsToDelete = (flowRecords || []).filter(record => {
      // Rule 1: NEVER delete spotting, regardless of cycleId or date.
      if (record.intensity === 'spotting') {
        return false;
      }
      // Rule 2: ONLY delete flow records (light, medium, heavy) that
      // explicitly belong to the cycle being cancelled, identified by cycleId.
      return record.cycleId === cycleId;
    });

    console.log(`Found ${flowRecordsToDelete.length} non-spotting flow records associated with cycle ${cycleId} to delete.`);

    // Map the filtered records to DELETE requests
    const deletePromises = flowRecordsToDelete.map(record =>
      apiRequest('DELETE', `/api/flow-records/${record.id}`)
        .catch(err => {
           if (!err?.message?.includes('404')) { // Log errors other than "Not Found"
             console.error(`Failed to delete flow record ${record.id} for cycle ${cycleId}:`, err);
           }
           // Allow Promise.all to continue even if one fails (optional, prevents stopping entire cancel)
           return null;
        })
    );

    // Wait for all flow record deletions to attempt completion
    Promise.all(deletePromises)
      .then(() => {
        console.log(`Finished attempting to delete associated flow records for cycle ${cycleId}. Now deleting the cycle itself.`);
        // AFTER attempting flow deletion, delete the cycle itself.
        return apiRequest('DELETE', `/api/cycles/${cycleId}`);
      })
      .then(() => {
        // Successfully deleted cycle, now invalidate and refetch
        toast({
          title: "Period Cancelled",
          description: "The period cycle and its associated flow data have been removed.",
          variant: "default"
        });
        console.log(`Successfully cancelled cycle ${cycleId}. Invalidating queries.`);

        // Invalidate queries to trigger data refresh from the server
        queryClient.invalidateQueries({ queryKey: [`/api/cycles?userId=${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cycles/current?userId=${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/flow-records?userId=${userId}`] });

        // Explicitly refetch for potentially faster UI update
        refetchCycles();
        refetchCurrentCycle();
        refetchFlowRecords();
      })
      .catch(error => {
        // Handle errors from deleting the CYCLE or critical flow record errors if not caught above
        toast({
          title: "Error",
          description: "Failed to fully cancel the period cycle.",
          variant: "destructive"
        });
        console.error(`Error cancelling period cycle ${cycleId}:`, error);
         // Attempt to refetch to sync state after partial failure
         refetchCycles();
         refetchCurrentCycle();
         refetchFlowRecords();
      });

  }, [ // ===== THIS IS THE DEPENDENCY ARRAY =====
      userId,           // Used in query keys for invalidation
      flowRecords,      // Used to filter records to delete
      refetchCycles,    // Called on success/error
      refetchCurrentCycle, // Called on success/error
      refetchFlowRecords,  // Called on success/error
      queryClient,      // Used to invalidate queries
      toast             // Used to show notifications
      // apiRequest is stable if defined outside, but include if needed
  ]);
  // ==================================================================
  // ================= END OF REPLACED FUNCTION =======================
  // ==================================================================


  // --- Keep recordFlow ---
  const recordFlow = useCallback((intensity: 'spotting' | 'light' | 'medium' | 'heavy', date?: Date) => {
    const dateToUse = date || selectedDate;
    const formattedDate = format(dateToUse, 'yyyy-MM-dd');
    const existingFlow = flowRecords?.find(r => r.date.split('T')[0] === formattedDate);

    if (existingFlow && existingFlow.intensity === intensity) {
      console.log(`Deleting existing flow record ${existingFlow.id} for date ${formattedDate}`);
      deleteFlowMutation.mutate(existingFlow.id);
    } else {
        // Determine the correct cycleId for the flow record
        // Find the cycle that ENCLOSES this date (if any)
        let targetCycleId: number | undefined = undefined;
        if (intensity !== 'spotting' && cycles) { // Only assign cycleId for non-spotting
            const enclosingCycle = cycles.find(c => {
                const start = parseISO(c.startDate);
                 // Treat ongoing cycles as potentially infinite end date for this check
                 const end = c.endDate ? parseISO(c.endDate) : new Date(8640000000000000); // Far future date
                 return dateToUse >= start && dateToUse <= end;
            });
            targetCycleId = enclosingCycle?.id;
            // If no enclosing cycle, check if it's the current cycle start date
            if (!targetCycleId && currentCycle && formattedDate === currentCycle.startDate.split('T')[0]) {
                targetCycleId = currentCycle.id;
            }
        }

        console.log(`Recording ${intensity} flow for ${formattedDate}. Assigning cycleId: ${targetCycleId}`);
        recordFlowMutation.mutate({
            userId,
            cycleId: targetCycleId, // Assign the determined cycleId (undefined for spotting or if no cycle matches)
            date: formattedDate,
            intensity
        });
    }
  }, [
      recordFlowMutation,
      deleteFlowMutation,
      userId,
      // currentCycle?.id, // Use cycles list instead for broader check
      selectedDate,
      flowRecords,
      cycles, // Need cycles to find the correct cycleId
      currentCycle // Needed as fallback for start date check
  ]);

  // --- Keep prediction logic (getAverageCycleLength, getLastPeriodStartDate, predictNextPeriod, getCyclePhaseForDate, isInFertileWindowForDate) ---
  const getAverageCycleLength = useCallback(() => {
    // Filter out cycles without an end date for length calculation
    const completeCycles = (cycles || []).filter(c => c.endDate);
    if (!completeCycles || completeCycles.length < 2) return userSettings?.defaultCycleLength || 28;

    let totalDays = 0;
    let count = 0;
    const sortedCycles = [...completeCycles].sort((a, b) =>
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() // Sort oldest to newest
    );
    for (let i = 1; i < sortedCycles.length; i++) {
      const currentStart = parseISO(sortedCycles[i].startDate);
      const previousStart = parseISO(sortedCycles[i - 1].startDate);
      const daysDiff = Math.round((currentStart.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 10 && daysDiff < 60) { // Basic sanity check for cycle length
        totalDays += daysDiff;
        count++;
      }
    }
    return count > 0 ? Math.round(totalDays / count) : (userSettings?.defaultCycleLength || 28);
  }, [cycles, userSettings?.defaultCycleLength]);


  const getLastPeriodStartDate = useCallback(() => {
     // Find the cycle with the most recent start date
     if (!cycles || cycles.length === 0) return null;
     const sortedCycles = [...cycles].sort((a, b) =>
         parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime() // Newest first
     );
     return parseISO(sortedCycles[0].startDate);
 }, [cycles]);

  const predictNextPeriod = useCallback(() => {
    const lastStart = getLastPeriodStartDate();
    if (!lastStart) return null;
    const avgLength = getAverageCycleLength();
    return addDays(lastStart, avgLength);
  }, [getLastPeriodStartDate, getAverageCycleLength]);

  const getCyclePhaseForDate = useCallback((date: Date = selectedDate) => {
    const lastPeriodStart = getLastPeriodStartDate();
    if (!lastPeriodStart) return 'Unknown';
    const { avgCycleLength, avgPeriodLength } = getBestCyclePredictionLengths(flowRecords || [], userSettings);
    // Use the utility function for calculation
    return getCyclePhase(date, lastPeriodStart, avgCycleLength, avgPeriodLength);
  }, [getLastPeriodStartDate, flowRecords, userSettings, selectedDate]);

  const isInFertileWindowForDate = useCallback((date: Date = selectedDate) => {
    const lastPeriodStart = getLastPeriodStartDate();
    if (!lastPeriodStart) return false;
    const { avgCycleLength, avgPeriodLength } = getBestCyclePredictionLengths(flowRecords || [], userSettings);
    // Use the utility function for calculation
    return isInFertileWindow(date, lastPeriodStart, avgCycleLength, avgPeriodLength);
  }, [getLastPeriodStartDate, flowRecords, userSettings, selectedDate]);

  // --- Return all the necessary values ---
  return {
    selectedDate,
    setSelectedDate,
    cycles,
    currentCycle,
    cycleDay: getCycleDay(),
    // Use the more accurate phase calculation if needed, otherwise keep the simpler one
    cyclePhase: getCyclePhaseForDate(), // Or use dataDrivenCyclePhase if preferred
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
    cancelPeriod, // <-- Ensure the corrected function is returned
    recordFlow,
    refetchCurrentCycle,
    refetchCycles,
    // Return prediction/utility functions if used by the UI
    getCyclePhaseForDate,
    isInFertileWindowForDate,
    predictNextPeriod,
    getAverageCycleLength
  };
}