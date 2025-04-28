import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SymptomCategory } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface CustomSymptomsProps {
  userId: number;
}

interface Symptom {
  id: number;
  name: string;
  category: string;
  userId?: number;
  isDefault: boolean;
}

const CustomSymptoms: React.FC<CustomSymptomsProps> = ({ userId }) => {
  const { toast } = useToast();
  const [newSymptomName, setNewSymptomName] = useState('');
  const [newSymptomCategory, setNewSymptomCategory] = useState(SymptomCategory.PHYSICAL);
  const [activeView, setActiveView] = useState<'custom' | 'default'>('custom');
  const [hiddenDefaultSymptoms, setHiddenDefaultSymptoms] = useState<number[]>([]);
  const [hiddenCustomSymptoms, setHiddenCustomSymptoms] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [symptomToDelete, setSymptomToDelete] = useState<Symptom | null>(null);
  
  // Fetch all symptoms
  const { data: symptoms, isLoading, error } = useQuery({
    queryKey: ['/api/user-symptoms', userId],
    queryFn: async () => {
      console.log('Fetching symptoms for user ID:', userId);
      
      // We need to ensure we send the userId parameter
      const url = `/api/user-symptoms?userId=${userId}`;
      console.log('Fetching from URL:', url);
      
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to fetch symptoms:', errorText);
        throw new Error(`Failed to fetch symptoms: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Fetched symptoms:', data);
      return data;
    },
    enabled: userId > 0,
  });
  
  // Fetch user settings to get hidden symptoms
  const { data: settings } = useQuery({
    queryKey: [`/api/user-settings/${userId}`],
    queryFn: () => fetch(`/api/user-settings/${userId}`).then(res => res.json()),
  });
  
  // Process hidden symptoms when settings data changes
  useEffect(() => {
    if (settings?.hiddenSymptoms) {
      try {
        const hiddenDefaults = JSON.parse(settings.hiddenSymptoms);
        if (Array.isArray(hiddenDefaults)) setHiddenDefaultSymptoms(hiddenDefaults);
      } catch (e) {
        console.error('Error parsing hidden default symptoms:', e);
      }
    }
    if (settings?.hiddenCustomSymptoms) {
      try {
        const hiddenCustoms = JSON.parse(settings.hiddenCustomSymptoms);
        if (Array.isArray(hiddenCustoms)) setHiddenCustomSymptoms(hiddenCustoms);
      } catch (e) {
        console.error('Error parsing hidden custom symptoms:', e);
      }
    }
  }, [settings]);
  
  // All symptoms including defaults
  const allSymptoms: Symptom[] = Array.isArray(symptoms) ? symptoms : [];
  
  // Custom symptoms are those created by the user (not default ones)
  const customSymptoms = allSymptoms.filter((symptom) => {
    return symptom.userId && 
           symptom.userId.toString() === userId.toString() && 
           symptom.isDefault === false;
  });
  
  // Helper to get all hidden symptom IDs
  const hiddenSymptomIds = Array.isArray(hiddenDefaultSymptoms) ? hiddenDefaultSymptoms : [];

  // Filter out hidden custom symptoms from all usages (including selector and analysis)
  const visibleCustomSymptoms = customSymptoms.filter(symptom => !hiddenCustomSymptoms.includes(symptom.id));
  const hiddenCustomSymptomsList = customSymptoms.filter(symptom => hiddenCustomSymptoms.includes(symptom.id));

  // Compute visible/hidden custom symptoms in the same way as defaults
  const visibleCustomSymptomsList = visibleCustomSymptoms.filter(
    symptom => !hiddenDefaultSymptoms.includes(symptom.id)
  );
  const hiddenCustomSymptomsListHidden = hiddenCustomSymptomsList.filter(
    symptom => hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  // Split custom symptoms by category
  const physicalCustomSymptoms = visibleCustomSymptoms.filter(symptom => 
    symptom.category === SymptomCategory.PHYSICAL || symptom.category === 'physical'
  );
  
  const emotionalCustomSymptoms = visibleCustomSymptoms.filter(symptom => 
    symptom.category === SymptomCategory.EMOTIONAL || symptom.category === 'emotional'
  );
  
  const pmddCustomSymptoms = visibleCustomSymptoms.filter(symptom => 
    symptom.category === SymptomCategory.PMDD || symptom.category === 'pmdd'
  );
  
  // Default symptoms for physical and emotional categories
  const physicalDefaultSymptoms = allSymptoms.filter((symptom) => {
    const isDefaultSymptom = symptom.isDefault === true;
    const isPhysical = symptom.category === SymptomCategory.PHYSICAL || symptom.category === 'physical';
    return isDefaultSymptom && isPhysical;
  });
  
  const emotionalDefaultSymptoms = allSymptoms.filter((symptom) => {
    const isDefaultSymptom = symptom.isDefault === true;
    const isEmotional = symptom.category === SymptomCategory.EMOTIONAL || symptom.category === 'emotional';
    return isDefaultSymptom && isEmotional;
  });
  
  const pmddDefaultSymptoms = allSymptoms.filter((symptom) => {
    const isDefaultSymptom = symptom.isDefault === true;
    const isPMDD = symptom.category === SymptomCategory.PMDD || symptom.category === 'pmdd';
    return isDefaultSymptom && isPMDD;
  });
  
  // Separate visible and hidden default symptoms
  const visiblePhysicalDefaults = physicalDefaultSymptoms.filter(
    symptom => !hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  const hiddenPhysicalDefaults = physicalDefaultSymptoms.filter(
    symptom => hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  const visibleEmotionalDefaults = emotionalDefaultSymptoms.filter(
    symptom => !hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  const hiddenEmotionalDefaults = emotionalDefaultSymptoms.filter(
    symptom => hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  const visiblePmddDefaults = pmddDefaultSymptoms.filter(
    symptom => !hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  const hiddenPmddDefaults = pmddDefaultSymptoms.filter(
    symptom => hiddenDefaultSymptoms.includes(symptom.id)
  );
  
  // Mutation to add a new symptom
  const addSymptomMutation = useMutation({
    mutationFn: async (newSymptom: { name: string; category: string; userId: number; isDefault: boolean }) => {
      console.log('Adding new symptom:', newSymptom);
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSymptom),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to add symptom:', errorText);
        throw new Error(`Failed to add symptom: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Added symptom response:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Successfully added symptom:', data);
      // Invalidate both queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user-symptoms', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/symptoms'] });
      setNewSymptomName('');
      toast({
        title: "Symptom added",
        description: "Your custom symptom has been added successfully.",
      });
    },
    onError: (error) => {
      console.error('Error adding symptom:', error);
      toast({
        title: "Error",
        description: "Failed to add symptom. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Helper to delete all symptom records for a given symptomId
  const deleteSymptomRecordsBySymptomId = async (symptomId: number) => {
    // Fetch all records for the user
    const res = await fetch(`/api/symptom-records?userId=${userId}`);
    if (!res.ok) return;
    const records = await res.json();
    const toDelete = records.filter((r: any) => r.symptomId === symptomId);
    // Delete each record
    await Promise.all(
      toDelete.map((r: any) =>
        fetch(`/api/symptom-records/${r.id}`, { method: 'DELETE' })
      )
    );
  };

  // Mutation to delete a symptom
  const deleteSymptomMutation = useMutation({
    mutationFn: async (symptomId: number) => {
      console.log('Deleting symptom with ID:', symptomId);
      const res = await fetch(`/api/symptoms/${symptomId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to delete symptom:', errorText);
        throw new Error(`Failed to delete symptom: ${res.status} ${res.statusText}`);
      }
      
      return res.json();
    },
    onSuccess: (data, symptomId) => {
      console.log('Successfully deleted symptom:', symptomId);
      // Invalidate all symptom-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user-symptoms', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/symptoms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/symptom-records'] });
      toast({
        title: "Symptom deleted",
        description: "Your custom symptom has been deleted.",
      });
    },
    onError: (error, symptomId) => {
      console.error('Error deleting symptom:', symptomId, error);
      toast({
        title: "Error",
        description: "Failed to delete symptom. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleAddSymptom = () => {
    if (!newSymptomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a symptom name.",
        variant: "destructive",
      });
      return;
    }
    
    const newSymptom = {
      name: newSymptomName.trim(),
      category: newSymptomCategory,
      userId,
      isDefault: false
    };
    
    addSymptomMutation.mutate(newSymptom);
  };
  
  const openDeleteDialog = (symptom: Symptom) => {
    setSymptomToDelete(symptom);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSymptomToDelete(null);
  };

  const handleConfirmDeleteSymptom = async () => {
    if (!symptomToDelete) return;
    // Delete all records for this symptom
    await deleteSymptomRecordsBySymptomId(symptomToDelete.id);
    // Delete the symptom itself
    deleteSymptomMutation.mutate(symptomToDelete.id);
    closeDeleteDialog();
  };
  
  // Mutation to update user settings with hidden symptoms
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: { hiddenSymptoms: string; hiddenCustomSymptoms: string }) => {
      return fetch(`/api/user-settings/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenSymptoms: settings.hiddenSymptoms, hiddenCustomSymptoms: settings.hiddenCustomSymptoms }),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update settings');
        return res.json();
      });
    },
    onSuccess: () => {
      // Invalidate user settings query
      queryClient.invalidateQueries({ queryKey: [`/api/user-settings/${userId}`] });
      
      // Also invalidate the user-symptoms query to refresh symptoms in Today page
      queryClient.invalidateQueries({ queryKey: ['/api/user-symptoms', userId] });
      
      toast({
        title: "Settings updated",
        description: "Your symptom visibility settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Toggle hiding/showing a default symptom
  const toggleHideDefaultSymptom = (symptomId: number) => {
    const newHiddenSymptoms = [...hiddenDefaultSymptoms];
    
    if (newHiddenSymptoms.includes(symptomId)) {
      // Remove from hidden symptoms (make visible again)
      const index = newHiddenSymptoms.indexOf(symptomId);
      newHiddenSymptoms.splice(index, 1);
    } else {
      // Add to hidden symptoms
      newHiddenSymptoms.push(symptomId);
    }
    
    // Update state
    setHiddenDefaultSymptoms(newHiddenSymptoms);
    
    // Save to database
    updateSettingsMutation.mutate({
      hiddenSymptoms: JSON.stringify(newHiddenSymptoms),
      hiddenCustomSymptoms: JSON.stringify(hiddenCustomSymptoms)
    });
  };

  const toggleHideCustomSymptom = (symptomId: number) => {
    const newHiddenCustomSymptoms = [...hiddenCustomSymptoms];
    
    if (newHiddenCustomSymptoms.includes(symptomId)) {
      // Remove from hidden
      const idx = newHiddenCustomSymptoms.indexOf(symptomId);
      newHiddenCustomSymptoms.splice(idx, 1);
    } else {
      newHiddenCustomSymptoms.push(symptomId);
    }
    setHiddenCustomSymptoms(newHiddenCustomSymptoms);
    // Save to DB
    updateSettingsMutation.mutate({
      hiddenSymptoms: JSON.stringify(hiddenDefaultSymptoms),
      hiddenCustomSymptoms: JSON.stringify(newHiddenCustomSymptoms)
    });
  };

  // Custom symptom button with hide/show toggle and delete
  const CustomSymptomButton = ({ symptom, isHidden, onToggle, onDelete }: { symptom: Symptom, isHidden: boolean, onToggle: () => void, onDelete: () => void }) => (
    <div className={`inline-flex items-center ${isHidden ? 'bg-muted/50' : 'bg-muted'} rounded-full mr-2 mb-2 pl-3 pr-1 py-1 text-sm`}>
      <span className="mr-1">{symptom.name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-6 w-6 p-0 rounded-full hover:bg-primary/20"
        title={isHidden ? "Show symptom" : "Hide symptom"}
      >
        {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </Button>
      {/* Only allow delete for custom symptoms */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-6 w-6 p-0 rounded-full hover:bg-destructive hover:text-white"
        title="Delete symptom"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  // Default symptom button with hide/show toggle
  const DefaultSymptomButton = ({ symptom, isHidden, onToggle }: { symptom: Symptom, isHidden: boolean, onToggle: () => void }) => (
    <div className={`inline-flex items-center ${isHidden ? 'bg-muted/50' : 'bg-muted'} rounded-full mr-2 mb-2 pl-3 pr-1 py-1 text-sm`}>
      <span className="mr-1">{symptom.name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-6 w-6 p-0 rounded-full hover:bg-primary/20"
        title={isHidden ? "Show symptom" : "Hide symptom"}
      >
        {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </Button>
    </div>
  );
  
  const renderLoading = () => (
    <div className="text-center py-4">
      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      <p className="text-sm text-muted-foreground mt-2">Loading symptoms...</p>
    </div>
  );
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Symptom Customization</CardTitle>
        <CardDescription>
          Customize which symptoms you want to track in your daily log
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Main tabs for Custom vs Default symptoms */}
        <Tabs defaultValue="custom" className="mb-6">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger 
              value="custom" 
              onClick={() => setActiveView('custom')}
              className={activeView === 'custom' ? 'font-medium' : ''}
            >
              Custom
            </TabsTrigger>
            <TabsTrigger 
              value="default" 
              onClick={() => setActiveView('default')}
              className={activeView === 'default' ? 'font-medium' : ''}
            >
              Default
            </TabsTrigger>
          </TabsList>
          
          {/* CUSTOM SYMPTOMS TAB */}
          <TabsContent value="custom">
            {/* Add new symptom */}
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="newSymptom">Add New Symptom</Label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1">
                    <Input 
                      id="newSymptom"
                      placeholder="Enter symptom name" 
                      value={newSymptomName}
                      onChange={(e) => setNewSymptomName(e.target.value)}
                    />
                  </div>
                  <div className="w-36">
                    <Select
                      value={newSymptomCategory}
                      onValueChange={(value: string) => setNewSymptomCategory(value as typeof SymptomCategory.PHYSICAL)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SymptomCategory.PHYSICAL}>Physical</SelectItem>
                        <SelectItem value={SymptomCategory.EMOTIONAL}>Emotional</SelectItem>
                        <SelectItem value={SymptomCategory.PMDD}>PMDD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAddSymptom} 
                    disabled={addSymptomMutation.isPending || !newSymptomName.trim()}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              renderLoading()
            ) : (
              <>
                {/* Visible custom symptoms */}
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-2">Custom Symptoms</h3>
                  <div className="flex flex-wrap">
                    {visibleCustomSymptoms.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No custom symptoms added yet.</p>
                    ) : (
                      visibleCustomSymptoms.map((symptom) => (
                        <CustomSymptomButton
                          key={symptom.id}
                          symptom={symptom}
                          isHidden={false}
                          onToggle={() => toggleHideCustomSymptom(symptom.id)}
                          onDelete={() => openDeleteDialog(symptom)}
                        />
                      ))
                    )}
                  </div>
                </div>
                {/* Hidden custom symptoms */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Archived (Hidden) Custom Symptoms</h4>
                  <div className="flex flex-wrap">
                    {hiddenCustomSymptomsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No archived custom symptoms.</p>
                    ) : (
                      hiddenCustomSymptomsList.map((symptom) => (
                        <CustomSymptomButton
                          key={symptom.id}
                          symptom={symptom}
                          isHidden={true}
                          onToggle={() => toggleHideCustomSymptom(symptom.id)}
                          onDelete={() => openDeleteDialog(symptom)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* DEFAULT SYMPTOMS TAB */}
          <TabsContent value="default">
            {isLoading ? (
              renderLoading()
            ) : (
              <>
                {/* Physical default symptoms */}
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-3">Physical Symptoms</h3>
                  
                  {/* Active Physical Default Symptoms */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Active Symptoms</h4>
                    <div className="flex flex-wrap">
                      {visiblePhysicalDefaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No active physical symptoms.</p>
                      ) : (
                        visiblePhysicalDefaults.map((symptom) => (
                          <DefaultSymptomButton
                            key={symptom.id}
                            symptom={symptom}
                            isHidden={false}
                            onToggle={() => toggleHideDefaultSymptom(symptom.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Hidden Physical Default Symptoms */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Hidden Symptoms</h4>
                    <div className="flex flex-wrap">
                      {hiddenPhysicalDefaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No hidden physical symptoms.</p>
                      ) : (
                        hiddenPhysicalDefaults.map((symptom) => (
                          <DefaultSymptomButton
                            key={symptom.id}
                            symptom={symptom}
                            isHidden={true}
                            onToggle={() => toggleHideDefaultSymptom(symptom.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Emotional default symptoms */}
                <div className="mb-6">
                  <h3 className="text-md font-semibold mb-3">Emotional Symptoms</h3>
                  
                  {/* Active Emotional Default Symptoms */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Active Symptoms</h4>
                    <div className="flex flex-wrap">
                      {visibleEmotionalDefaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No active emotional symptoms.</p>
                      ) : (
                        visibleEmotionalDefaults.map((symptom) => (
                          <DefaultSymptomButton
                            key={symptom.id}
                            symptom={symptom}
                            isHidden={false}
                            onToggle={() => toggleHideDefaultSymptom(symptom.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Hidden Emotional Default Symptoms */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Hidden Symptoms</h4>
                    <div className="flex flex-wrap">
                      {hiddenEmotionalDefaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No hidden emotional symptoms.</p>
                      ) : (
                        hiddenEmotionalDefaults.map((symptom) => (
                          <DefaultSymptomButton
                            key={symptom.id}
                            symptom={symptom}
                            isHidden={true}
                            onToggle={() => toggleHideDefaultSymptom(symptom.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {/* PMDD default symptoms */}
                <div>
                  <h3 className="text-md font-semibold mb-3">PMDD Symptoms</h3>
                  
                  {/* Active PMDD Default Symptoms */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Active Symptoms</h4>
                    <div className="flex flex-wrap">
                      {visiblePmddDefaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No active PMDD symptoms.</p>
                      ) : (
                        visiblePmddDefaults.map((symptom) => (
                          <DefaultSymptomButton
                            key={symptom.id}
                            symptom={symptom}
                            isHidden={false}
                            onToggle={() => toggleHideDefaultSymptom(symptom.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Hidden PMDD Default Symptoms */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Hidden Symptoms</h4>
                    <div className="flex flex-wrap">
                      {hiddenPmddDefaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No hidden PMDD symptoms.</p>
                      ) : (
                        hiddenPmddDefaults.map((symptom) => (
                          <DefaultSymptomButton
                            key={symptom.id}
                            symptom={symptom}
                            isHidden={true}
                            onToggle={() => toggleHideDefaultSymptom(symptom.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      {deleteDialogOpen && symptomToDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Symptom?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <b>{symptomToDelete.name}</b>? This action cannot be undone. Please note that this option is only available for custom symptoms.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteSymptom} className="bg-destructive text-white hover:bg-destructive/80">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
};

export default CustomSymptoms;