import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Pill, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/date-utils';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Medication type
export type Medication = {
  id: number;
  name: string;
  dose?: string;
  frequency?: string;
  logs: { date: string }[];
};

interface MedicationTrackerProps {
  userId: number;
  selectedDate: Date;
}

const MedicationTracker: React.FC<MedicationTrackerProps> = ({ userId, selectedDate }) => {
  const { toast } = useToast();
  const [newMedicationName, setNewMedicationName] = useState('');
  const [newMedicationDose, setNewMedicationDose] = useState('');
  const [activeMedication, setActiveMedication] = useState<Medication | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // React Query v5+ requires the object form
  const { data, refetch } = useQuery({
    queryKey: ['medications', userId],
    queryFn: async () => {
      const res = await axios.get(`/api/medications?userId=${userId}`);
      return res.data as Medication[];
    },
    refetchOnWindowFocus: false,
  });
  const medications: Medication[] = data ?? [];

  // React Query v5+ requires the object form for useMutation too
  const addMedicationMutation = useMutation({
    mutationFn: ({ name, dose }: { name: string; dose?: string }) =>
      axios.post('/api/medications', { userId, name, dose }),
    onSuccess: () => refetch(),
  });

  const deleteMedicationMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/medications/${id}`, { data: { userId } }),
    onSuccess: () => refetch(),
  });

  const logMedicationMutation = useMutation({
    mutationFn: ({ medicationId, date, log }: { medicationId: number; date: string; log: boolean }) => {
      if (log) {
        return axios.post(`/api/medications/${medicationId}/log`, { userId, date });
      } else {
        return axios.post(`/api/medications/${medicationId}/unlog`, { userId, date });
      }
    },
    onSuccess: () => refetch(),
  });

  const handleAddMedication = () => {
    if (!newMedicationName.trim()) {
      toast({ title: "Error", description: "Please enter a medication name.", variant: "destructive", duration: 3000 });
      return;
    }
    addMedicationMutation.mutate({ name: newMedicationName.trim(), dose: newMedicationDose.trim() || undefined });
    setNewMedicationName('');
    setNewMedicationDose('');
    toast({ title: "Medication added", description: "Your medication has been added for tracking.", duration: 3000 });
  };

  const requestDeleteMedication = (id: number) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMedication = () => {
    if (pendingDeleteId !== null) {
      deleteMedicationMutation.mutate(pendingDeleteId);
      toast({ title: "Medication deleted", description: "The medication has been removed from tracking.", duration: 3000 });
    }
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const cancelDeleteMedication = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const handleLogMedicationForDate = (medicationId: number, date: Date) => {
    const formattedDate = formatDate(date);
    const med = medications.find((m) => m.id === medicationId);
    const alreadyLogged = med?.logs.some((log) => log.date === formattedDate);
    logMedicationMutation.mutate({ medicationId, date: formattedDate, log: !alreadyLogged });
    toast({ title: "Medication tracked", description: alreadyLogged ? `Log removed for ${formattedDate}.` : `Your medication intake has been recorded for ${formattedDate}.`, duration: 3000 });
  };

  const handleLogMedication = (medicationId: number) => {
    handleLogMedicationForDate(medicationId, selectedDate);
  };

  const isMedicationLoggedOnDate = (medication: Medication, date: Date) => {
    const formattedDate = formatDate(date);
    return medication.logs.some((log) => log.date === formattedDate);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          <span>Medication Tracking</span>
        </CardTitle>
        <CardDescription>
          Track medications you take to better understand how they affect your symptoms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Add medication form */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newMedication">Add Medication</Label>
              <div className="flex flex-wrap gap-2">
                <div className="flex-1">
                  <Input 
                    id="newMedication"
                    placeholder="Medication name" 
                    value={newMedicationName}
                    onChange={(e) => setNewMedicationName(e.target.value)}
                  />
                </div>
                <div className="w-28">
                  <Input 
                    placeholder="Dose (optional)" 
                    value={newMedicationDose}
                    onChange={(e) => setNewMedicationDose(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddMedication} 
                  disabled={!newMedicationName.trim()}
                  className={
                    `gap-1 medication-add-btn${!!newMedicationName.trim() ? ' selected' : ''}`
                  }
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Medications list */}
          <div>
            <h4 className="text-sm font-medium mb-2">Your Medications</h4>
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No medications added yet.</p>
            ) : (
              <div className="space-y-2">
                {medications.map((medication: Medication) => {
                  const loggedToday = isMedicationLoggedOnDate(medication, selectedDate);
                  
                  return (
                    <div 
                      key={medication.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="font-medium">{medication.name}</span>
                          {medication.dose && (
                            <Badge variant="outline" className="ml-2">
                              {medication.dose}
                            </Badge>
                          )}
                        </div>
                        {medication.frequency && (
                          <span className="text-xs text-muted-foreground">
                            {medication.frequency}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={loggedToday ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleLogMedication(medication.id)}
                          className={`h-8 gap-1 medication-btn${loggedToday ? ' selected' : ''}`}
                          title={loggedToday ? `Taken on ${formatDate(selectedDate)} (click to undo)` : `Mark as taken on ${formatDate(selectedDate)}`}
                        >
                          {loggedToday && <Check className="h-3.5 w-3.5" />}
                          <span>{loggedToday ? "Taken" : "Need to take"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestDeleteMedication(medication.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medication?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this medication? This will remove all logs and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDeleteMedication}>Delete</Button>
            <Button variant="outline" onClick={cancelDeleteMedication}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MedicationTracker;