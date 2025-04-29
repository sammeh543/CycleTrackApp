import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Symptom {
  id: number;
  name: string;
  category: 'physical' | 'emotional' | 'pmdd' | 'activity'; // Added 'activity' for sex logs
  isDefault: boolean;
  userId: number | null;
}

interface SymptomRecord {
  id: number;
  userId: number;
  symptomId: number;
  date: string;
  intensity: number;
}

interface MoodRecord {
  id: number;
  userId: number;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'awful';
}

interface CervicalMucusRecord {
  id: number;
  userId: number;
  date: string;
  type: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
}

interface DailyNote {
  id: number;
  userId: number;
  date: string;
  notes: string;
}

export interface SexRecord {
  id: number;
  userId: number;
  date: string;
  protected?: boolean; // Optional, for future extensibility
}


interface UseSymptomsProps {
  userId: number;
  date?: Date;
}

type CervicalMucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';

export function useSymptoms({ userId, date = new Date(), showPmddSymptoms = true }: UseSymptomsProps & { showPmddSymptoms?: boolean }) {
  const { toast } = useToast();
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Get all symptoms
  const { data: symptoms, isLoading: symptomsLoading } = useQuery({
    queryKey: ['/api/user-symptoms', userId],
    queryFn: () => fetch(`/api/user-symptoms?userId=${userId}`).then(res => res.json()),
    enabled: !!userId,
    staleTime: 0,
  });
  
  // Get user settings to access hidden symptoms
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/user-settings/${userId}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/user-settings/${userId}`);
        return res.json();
      } catch (e) {
        console.error('Error fetching user settings:', e);
        return null;
      }
    },
    enabled: !!userId
  });
  
  // Get symptom records for the specified date
  const { 
    data: symptomRecords, 
    isLoading: symptomRecordsLoading,
    refetch: refetchSymptomRecords
  } = useQuery({
    queryKey: ['/api/symptom-records/date', userId, formattedDate],
    queryFn: async () => {
      console.log('[SYMPTOM-HOOK] Fetching /api/symptom-records/date', { userId, formattedDate });
      const res = await fetch(`/api/symptom-records/date?userId=${userId}&date=${formattedDate}`);
      const data = await res.json();
      console.log('[SYMPTOM-HOOK] Received records:', data);
      return data;
    },
    enabled: !!userId
  });
  
  // Get mood record for the specified date
  const { 
    data: moodRecord, 
    isLoading: moodRecordLoading,
    refetch: refetchMoodRecord
  } = useQuery({
    queryKey: ['/api/mood-records/date', userId, formattedDate],
    queryFn: async () => {
      console.log('[MOOD-HOOK] Fetching mood record for date', { userId, formattedDate });
      try {
        const res = await fetch(`/api/mood-records/date?userId=${userId}&date=${formattedDate}`);
        if (res.status === 404) {
          console.log('[MOOD-HOOK] No mood record found for date');
          return null;
        }
        
        const data = await res.json();
        console.log('[MOOD-HOOK] Received mood record:', data);
        return data;
      } catch (error) {
        console.error('[MOOD-HOOK] Error fetching mood record:', error);
        return null;
      }
    },
    enabled: !!userId
  });
  
  // Get daily note for the specified date
  const { 
    data: dailyNote, 
    error: dailyNoteError,
    isLoading: dailyNoteLoading,
    refetch: refetchDailyNote
  } = useQuery({
    queryKey: ['/api/daily-notes/date', userId, formattedDate],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/daily-notes/date?userId=${userId}&date=${formattedDate}`);
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch daily note: ${res.status}`);
      } catch (error) {
        console.error("[DAILY-NOTE-HOOK] Error fetching daily note:", error);
        return null;
      }
    },
    enabled: !!userId
  });
  
  // Parse hidden symptoms from user settings
  const hiddenSymptomIds: number[] = [];
  const hiddenCustomSymptomIds: number[] = [];

  function parseHidden(val: any): number[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      if (val.trim() === "") return [];
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  if (userSettings?.hiddenSymptoms !== undefined) {
    try {
      hiddenSymptomIds.push(...parseHidden(userSettings.hiddenSymptoms));
    } catch (e) {
      console.error('Error parsing hidden symptoms:', e);
    }
  }
  if (userSettings?.hiddenCustomSymptoms !== undefined) {
    try {
      hiddenCustomSymptomIds.push(...parseHidden(userSettings.hiddenCustomSymptoms));
    } catch (e) {
      console.error('Error parsing hidden custom symptoms:', e);
    }
  }
  
  // Group symptoms by category and filter out hidden default and hidden custom symptoms
  const filterVisibleSymptoms = (s: Symptom) => {
    // If it's a default symptom and it's in the hidden list, filter it out
    if (s.isDefault && hiddenSymptomIds.includes(s.id)) {
      return false;
    }
    // If it's a custom symptom and it's in the hidden custom symptom list, filter it out
    if (!s.isDefault && hiddenCustomSymptomIds.includes(s.id)) {
      return false;
    }
    // If it's a custom symptom and it's not present in the symptoms list (e.g., deleted), filter it out
    // (This is already handled by the backend, but just in case)
    return true;
  };

  // Deduplicate symptoms by name and category
  const deduplicateSymptoms = (symptoms: Symptom[]) => {
    const uniqueSymptoms = new Map<string, Symptom>();
    
    // Process default symptoms first
    symptoms.forEach(symptom => {
      if (symptom.isDefault) {
        const key = `${symptom.name}:${symptom.category}`;
        if (!uniqueSymptoms.has(key)) {
          uniqueSymptoms.set(key, symptom);
        }
      }
    });
    
    // Then process custom symptoms
    symptoms.forEach(symptom => {
      if (!symptom.isDefault) {
        const key = `${symptom.name}:${symptom.category}:${symptom.userId}`;
        if (!uniqueSymptoms.has(key)) {
          uniqueSymptoms.set(key, symptom);
        }
      }
    });
    
    return Array.from(uniqueSymptoms.values());
  };

  // Filter out deleted custom symptoms (e.g., those removed from the DB)
  let allSymptoms: Symptom[] = Array.isArray(symptoms) ? symptoms : [];
  const dedupedSymptoms = deduplicateSymptoms(allSymptoms);
  let visibleSymptoms = dedupedSymptoms.filter(filterVisibleSymptoms);

  // Filter out PMDD symptoms if setting is off
  if (!showPmddSymptoms) {
    visibleSymptoms = visibleSymptoms.filter((s: Symptom) => s.category !== 'pmdd');
  }
  
  const physicalSymptoms = visibleSymptoms.filter((s: Symptom) => s.category === 'physical');
  const emotionalSymptoms = visibleSymptoms.filter((s: Symptom) => s.category === 'emotional');
  const pmddSymptoms = visibleSymptoms.filter((s: Symptom) => s.category === 'pmdd');
  
  // Helper to check if a symptom is active
  const isSymptomActive = useCallback((symptomId: number) => {
    return symptomRecords?.some((record: SymptomRecord) => record.symptomId === symptomId) || false;
  }, [symptomRecords]);
  
  // Create mutation to toggle symptoms
  const toggleSymptomMutation = useMutation({
    mutationFn: async (symptomId: number) => {
      try {
        // Get the symptom by ID
        const symptom = allSymptoms.find((s: Symptom) => s.id === symptomId);
        if (!symptom) {
          console.error('[SYMPTOM-HOOK] Symptom not found:', symptomId);
          return Promise.resolve();
        }
        
        // Check if this is a duplicate symptom (same name and category)
        const duplicates = allSymptoms.filter((s: Symptom) => 
          s.name === symptom.name && 
          s.category === symptom.category && 
          s.isDefault === symptom.isDefault
        );
        
        if (isSymptomActive(symptomId)) {
          // If removing a symptom, delete ALL records for duplicates of this symptom
          const recordsToDelete = symptomRecords.filter((record: SymptomRecord) => 
            duplicates.some((dup: Symptom) => dup.id === record.symptomId)
          );
          
          if (recordsToDelete.length > 0) {
            console.log('[SYMPTOM-HOOK] Deleting symptom records for duplicates:', 
              recordsToDelete.map((r: SymptomRecord) => r.id));
            
            // Delete all duplicate records one by one
            const deletePromises = recordsToDelete.map((record: SymptomRecord) => 
              apiRequest('DELETE', `/api/symptom-records/${record.id}`)
            );
            
            return Promise.all(deletePromises);
          }
          return Promise.resolve();
        } else {
          // When adding a symptom, only create ONE record for the first instance of this symptom
          // to avoid creating multiple records for duplicates
          const firstDuplicate = duplicates[0];
          
          // Create new record only for the first duplicate
          const payload = {
            userId,
            symptomId: firstDuplicate.id, // Use the ID of the first duplicate
            date: formattedDate,
            intensity: 1
          };
          
          console.log('[SYMPTOM-HOOK] Creating new symptom record for first duplicate:', payload);
          return apiRequest('POST', '/api/symptom-records', payload);
        }
      } catch (error) {
        console.error("Error toggling symptom:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch to update UI immediately for instant feedback
      refetchSymptomRecords();
      
      // Also invalidate the general symptom records query
      queryClient.invalidateQueries({ queryKey: ['/api/symptom-records'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update symptom",
        variant: "destructive",
      });
      console.error(error);
    }
  });
  
  const recordMoodMutation = useMutation({
    mutationFn: async (mood: 'great' | 'good' | 'okay' | 'bad' | 'awful') => {
      console.log('[MOOD-HOOK] Setting mood to', mood, 'for date', formattedDate);
      const res = await apiRequest('POST', '/api/mood-records', { userId, date: formattedDate, mood });
      const data: MoodRecord = await res.json();
      return data;
    },
    onSuccess: (data) => {
      console.log('[MOOD-HOOK] Mood updated successfully, updating cache and refetching');
      // Update cache for the specific date query
      queryClient.setQueryData(['/api/mood-records/date', userId, formattedDate], data);
      // Refresh the query to update UI
      refetchMoodRecord();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update mood",
        variant: "destructive",
      });
      console.error(error);
    }
  });
  
  const saveDailyNoteMutation = useMutation({
    mutationFn: (notes: string) => {
      try {
        return apiRequest('POST', '/api/daily-notes', {
          userId,
          date: formattedDate,
          notes
        });
      } catch (error) {
        console.error("Error saving notes:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Use invalidation instead of refetch
      queryClient.invalidateQueries({ queryKey: ['/api/daily-notes/date', userId, formattedDate] });
      
      // Keep a subtle toast for notes since this is a direct user action
      toast({
        title: "Success",
        description: "Notes saved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
      console.error("[DAILY-NOTE-HOOK] Error saving daily note:", error);
    }
  });
  
  // Helper functions
  const toggleSymptom = useCallback((symptomId: number) => {
    toggleSymptomMutation.mutate(symptomId);
  }, [toggleSymptomMutation]);
  
  const recordMood = useCallback((mood: 'great' | 'good' | 'okay' | 'bad' | 'awful') => {
    recordMoodMutation.mutate(mood);
  }, [recordMoodMutation]);
  
  const saveDailyNote = useCallback((notes: string) => {
    saveDailyNoteMutation.mutate(notes);
  }, [saveDailyNoteMutation]);
  
  // Get symptom intensity for a specific symptom
  const getSymptomIntensity = useCallback((symptomId: number): number => {
    if (!symptomRecords) return 0;
    const record = symptomRecords.find((r: SymptomRecord) => r.symptomId === symptomId);
    return record ? record.intensity : 0;
  }, [symptomRecords]);

  // Update symptom intensity
  const updateSymptomIntensityMutation = useMutation({
    mutationFn: async ({ symptomId, intensity }: { symptomId: number, intensity: number }) => {
      try {
        // If we already have a record, update it
        if (isSymptomActive(symptomId)) {
          const record = symptomRecords.find((r: SymptomRecord) => r.symptomId === symptomId);
          if (record) {
            console.log('[SYMPTOM-HOOK] Updating symptom intensity', { id: record.id, intensity });
            return apiRequest('PATCH', `/api/symptom-records/${record.id}`, { intensity });
          }
        } 
        // Otherwise create a new record with the specified intensity
        const payload = {
          userId,
          symptomId,
          date: formattedDate,
          intensity
        };
        console.log('[SYMPTOM-HOOK] Creating new symptom record with intensity', payload);
        return apiRequest('POST', '/api/symptom-records', payload);
      } catch (error) {
        console.error("Error updating symptom intensity:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/symptom-records/date', userId, formattedDate] });
      
      // No need for toast notifications on every intensity change as it can be distracting
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update symptom intensity",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Helper function to update symptom intensity
  const updateSymptomIntensity = useCallback((symptomId: number, intensity: number) => {
    updateSymptomIntensityMutation.mutate({ symptomId, intensity });
  }, [updateSymptomIntensityMutation]);

  // Get cervical mucus record for the specified date
  const { 
    data: cervicalMucusRecord, 
    isLoading: cervicalMucusLoading,
    refetch: refetchCervicalMucus
  } = useQuery({
    // Use dedicated date endpoint
    queryKey: ['/api/cervical-mucus-records/date', userId, formattedDate],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/cervical-mucus-records/date?userId=${userId}&date=${formattedDate}`);
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch cervical mucus record: ${res.status}`);
      } catch (error) {
        console.error("[SYMPTOM-HOOK] Error fetching cervical mucus record:", error);
        return null;
      }
    },
    enabled: !!userId
  });

  // Debug log
  useEffect(() => {
    console.log('[SYMPTOM-HOOK] cervicalMucusRecord:', cervicalMucusRecord);
  }, [cervicalMucusRecord]);

  // Cervical mucus mutation
  const recordCervicalMucusMutation = useMutation({
    mutationFn: async (type: CervicalMucusType | undefined) => {
      try {
        if (!type) {
          // If type is undefined, delete the existing record
          if (cervicalMucusRecord) {
            console.log('[SYMPTOM-HOOK] Deleting cervical mucus record for date:', formattedDate);
            await apiRequest('DELETE', `/api/cervical-mucus-records?userId=${userId}&date=${formattedDate}`);
            return { success: true, deleted: true };
          }
          return { success: true, noAction: true };
        }
        // POST to backend to create or update the record
        const res = await apiRequest('POST', '/api/cervical-mucus-records', {
          userId,
          date: formattedDate,
          type
        });
        return res;
      } catch (error) {
        console.error("Error recording cervical mucus:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate the date endpoint
      queryClient.invalidateQueries({ queryKey: ['/api/cervical-mucus-records/date', userId, formattedDate] });
      refetchCervicalMucus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record cervical mucus",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Current cervical mucus type from record or local state
  const [localCervicalMucusType, setLocalCervicalMucusType] = useState<CervicalMucusType | undefined>(undefined);
  
  // Update local state when record changes
  useEffect(() => {
    // Reset or set local type based on fetched record
    setLocalCervicalMucusType(cervicalMucusRecord?.type);
  }, [cervicalMucusRecord]);

  // Record cervical mucus function
  const recordCervicalMucus = useCallback((type: CervicalMucusType | undefined) => {
    setLocalCervicalMucusType(type);
    recordCervicalMucusMutation.mutate(type);
  }, [recordCervicalMucusMutation]);
  
  // Expose the current cervical mucus type
  const cervicalMucusType = cervicalMucusRecord?.type || localCervicalMucusType;

  return {
    symptoms: visibleSymptoms,
    physicalSymptoms,
    emotionalSymptoms,
    pmddSymptoms,
    symptomRecords,
    moodRecord,
    dailyNote,
    cervicalMucusType,
    isLoading: symptomsLoading || settingsLoading || symptomRecordsLoading || moodRecordLoading || dailyNoteLoading || cervicalMucusLoading,
    isPending: toggleSymptomMutation.isPending || recordMoodMutation.isPending || 
              saveDailyNoteMutation.isPending || updateSymptomIntensityMutation.isPending ||
              recordCervicalMucusMutation.isPending,
    isSymptomActive,
    toggleSymptom,
    recordMood,
    saveDailyNote,
    getSymptomIntensity,
    updateSymptomIntensity,
    recordCervicalMucus
  };
}
