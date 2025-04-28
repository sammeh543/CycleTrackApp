import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { clearAllStorage } from '@/lib/storage-utils';
import { FileSpreadsheet, FileJson } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface AppSettingsProps {
  userId: number;
}

// Define the settings type
interface UserSettings {
  id: number;
  userId: number;
  dataStorage?: string;
  language?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  defaultCycleLength?: number;
  defaultPeriodLength?: number;
  showPmddSymptoms?: boolean;
}

const AppSettings: React.FC<AppSettingsProps> = ({ userId }) => {
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [showPmddSymptoms, setShowPmddSymptoms] = useState<boolean>(true);
  const { toast } = useToast();
  
  // Fetch user settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: [`/api/user-settings/${userId}`],
    enabled: userId > 0
  });
  
  useEffect(() => {
    if (settings && typeof settings.showPmddSymptoms === 'boolean') {
      setShowPmddSymptoms(settings.showPmddSymptoms);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updateData: { 
      dataStorage?: string; 
      language?: string;
      defaultCycleLength?: number;
      defaultPeriodLength?: number;
      showPmddSymptoms?: boolean;
    }) => {
      return apiRequest('PATCH', `/api/user-settings/${userId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-settings/${userId}`] });
      toast({
        title: 'Settings updated',
        description: 'Your settings have been saved.',
        duration: 3000
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      console.error(error);
    }
  });
  
  // Check if the app is running as a PWA and if device is iOS
  useEffect(() => {
    setIsPwaInstalled(window.matchMedia('(display-mode: standalone)').matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  }, []);
  
  // Handle install PWA instructions for iOS
  const handleInstallPwa = () => {
    if (isIOS) {
      toast({
        title: 'Add to Home Screen',
        description: 'To install this app on your iPhone: tap the share button, then "Add to Home Screen"',
        duration: 3000
      });
    }
  };
  
  // Handle setting changes
  const handleStorageChange = (value: string) => {
    updateSettingsMutation.mutate({ dataStorage: value });
  };
  
  const handleLanguageChange = (value: string) => {
    updateSettingsMutation.mutate({ language: value });
  };
  
  const handleCycleLengthChange = (value: string) => {
    if (value === 'custom') {
      // Show custom input field (this will happen through conditional rendering)
      // Use a temporary custom value that isn't in the predefined list
      updateSettingsMutation.mutate({ defaultCycleLength: 36 });
    } else {
      updateSettingsMutation.mutate({ defaultCycleLength: parseInt(value) });
    }
  };
  
  const handlePeriodLengthChange = (value: string) => {
    if (value === 'custom') {
      // Show custom input field (this will happen through conditional rendering)
      // Use a temporary custom value that isn't in the predefined list
      updateSettingsMutation.mutate({ defaultPeriodLength: 11 });
    } else {
      updateSettingsMutation.mutate({ defaultPeriodLength: parseInt(value) });
    }
  };

  const handlePmddToggle = (checked: boolean) => {
    setShowPmddSymptoms(checked);
    updateSettingsMutation.mutate({ ...settings, showPmddSymptoms: checked });
  };

  // Data reset mutation
  const resetDataMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', '/api/reset-data', { userId });
    },
    onSuccess: () => {
      // Clear local storage
      clearAllStorage();
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      toast({
        title: 'Data cleared',
        description: 'All your data has been reset successfully.',
        duration: 3000
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to reset data. Please try again.',
        variant: 'destructive',
      });
      console.error(error);
    }
  });
  
  // Handle data reset
  const handleResetData = () => {
    setResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    setResetDialogOpen(false);
    resetDataMutation.mutate();
  };

  const handleCancelReset = () => {
    setResetDialogOpen(false);
  };
  
  // Theme selection logic
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'original');
  useEffect(() => {
    document.body.classList.remove('theme-original', 'theme-starry', 'theme-nebula', 'theme-pinkwhite', 'theme-beach', 'theme-galaxy', 'theme-aurora', 'theme-ocean', 'theme-cyberpunk', 'theme-synthwave', 'theme-lunar', 'theme-moon');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Custom background image logic
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem('customBgImage');
    if (stored) setBgPreview(stored);
  }, []);
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setBgPreview(url);
      localStorage.setItem('customBgImage', url);
    };
    reader.readAsDataURL(file);
  };
  const handleBgRemove = () => {
    setBgPreview(null);
    localStorage.removeItem('customBgImage');
  };

  // Export/Backup logic
  const handleDownloadCSV = () => {
    window.open(`/api/export/${userId}`, '_blank');
  };

  const handleDownloadJSON = async () => {
    try {
      // Fetch all user data, including medications
      const [cycles, flowRecords, moodRecords, symptoms, symptomRecords, dailyNotes, userSettings, medications] = await Promise.all([
        fetch(`/api/cycles?userId=${userId}`).then(res => res.json()),
        fetch(`/api/flow-records?userId=${userId}`).then(res => res.json()),
        fetch(`/api/mood-records?userId=${userId}`).then(res => res.json()),
        fetch(`/api/user-symptoms?userId=${userId}`).then(res => res.json()),
        fetch(`/api/symptom-records?userId=${userId}`).then(res => res.json()),
        fetch(`/api/daily-notes?userId=${userId}`).then(res => res.json()),
        fetch(`/api/user-settings/${userId}`).then(res => res.json()),
        fetch(`/api/medications?userId=${userId}`).then(res => res.json())
      ]);

      // Prepare data for export
      const exportData = {
        userId,
        exportDate: new Date().toISOString(),
        data: {
          cycles,
          flowRecords,
          moodRecords,
          symptoms,
          symptomRecords,
          dailyNotes,
          userSettings,
          medications
        }
      };

      // Create and download the JSON file
      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cycle_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('There was an error creating your backup. Please try again.');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      // Send backup to server or merge locally as needed
      // For now: POST to /api/import-backup
      await fetch(`/api/import-backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });
      alert('Backup imported successfully! Please refresh the page.');
    } catch (err) {
      alert('Failed to import backup. Please check your file.');
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">App Settings</h3>
          <div className="flex justify-center my-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">App Settings</h3>

          {/* Theme selector section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Theme</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'original', label: 'Original' },
                { value: 'starry', label: 'Starry' },
                { value: 'nebula', label: 'Nebula' },
                { value: 'pinkwhite', label: 'PinkWhite' },
                { value: 'beach', label: 'Beach' },
                { value: 'galaxy', label: 'Galaxy' },
                { value: 'aurora', label: 'Aurora' },
                { value: 'ocean', label: 'Ocean' },
                { value: 'cyberpunk', label: 'Cyberpunk ' },
                { value: 'synthwave', label: 'Synthwave ' },
                { value: 'lunar', label: 'Lunar ' },
                { value: 'moon', label: 'Moon ' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${theme === value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'} ${theme === value && (value === 'cyberpunk' || value === 'synthwave' || value === 'lunar') ? 'glow' : ''}`}
                  style={theme === value && (value === 'cyberpunk' || value === 'synthwave' || value === 'lunar') ? { boxShadow: 'var(--glow)', textShadow: '0 0 8px currentColor, 0 0 16px currentColor' } : {}}
                  onClick={() => setTheme(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom background image section */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Custom Background Image</label>
            {bgPreview ? (
              <div className="mb-2">
                <img src={bgPreview} alt="Custom background preview" className="w-full h-32 object-cover rounded-lg border mb-2" />
                <Button variant="destructive" onClick={handleBgRemove} size="sm">Remove Image</Button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={handleBgUpload} className="block w-full text-sm" />
            )}
            <p className="text-xs text-muted-foreground mt-1">If set, your image will override the theme background.</p>
          </div>

          {/* Export & Backup section */}
          <h3 className="text-lg font-semibold mb-3">Export & Backup</h3>
          <div className="flex flex-col gap-4">
            <Button onClick={handleDownloadCSV} variant="outline" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Download Data as CSV
            </Button>
            <Button onClick={handleDownloadJSON} variant="outline" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              Download Full Backup (JSON)
            </Button>
          </div>

          {/* Existing settings UI continues below... */}
          <div className="flex items-center mb-4">
            <input
              id="showDevSettings"
              type="checkbox"
              checked={showDevSettings}
              onChange={e => setShowDevSettings(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showDevSettings" className="text-sm">
              Show unfinished/dev settings
            </label>
          </div>
          <div className="space-y-4">
            {showDevSettings && (
              <>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Add to Home Screen</span>
                  <Button 
                    variant="link" 
                    className="text-primary p-0 h-auto"
                    onClick={handleInstallPwa}
                    disabled={isPwaInstalled}
                  >
                    {isPwaInstalled ? 'Installed' : 'Install'}
                  </Button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Data Storage</span>
                  <Select 
                    defaultValue={settings?.dataStorage || "local"}
                    onValueChange={handleStorageChange}
                  >
                    <SelectTrigger className="w-[150px] h-8 text-sm bg-muted">
                      <SelectValue placeholder="Storage type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="local">Local Storage Only</SelectItem>
                      <SelectItem value="cloud">Cloud Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">App Language</span>
                  <Select 
                    defaultValue={settings?.language || "English"}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="w-[150px] h-8 text-sm bg-muted">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground mt-2">These features are unfinished and only visible in dev mode.</div>
              </>
            )}
            <div className="flex items-center justify-between py-2 border-t border-border pt-4">
              <span className="text-sm font-medium">Cycle Settings</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Default Cycle Length</span>
              <div className="flex items-center gap-2">
                <Select 
                  defaultValue={settings?.defaultCycleLength?.toString() || "28"}
                  onValueChange={handleCycleLengthChange}
                >
                  <SelectTrigger className="w-[110px] h-8 text-sm bg-muted">
                    <SelectValue placeholder="Cycle length" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {[21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35].map(days => (
                      <SelectItem key={days} value={days.toString()}>{days} days</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {settings?.defaultCycleLength !== 21 && 
                 settings?.defaultCycleLength !== 22 && 
                 settings?.defaultCycleLength !== 23 && 
                 settings?.defaultCycleLength !== 24 && 
                 settings?.defaultCycleLength !== 25 && 
                 settings?.defaultCycleLength !== 26 && 
                 settings?.defaultCycleLength !== 27 && 
                 settings?.defaultCycleLength !== 28 && 
                 settings?.defaultCycleLength !== 29 && 
                 settings?.defaultCycleLength !== 30 && 
                 settings?.defaultCycleLength !== 31 && 
                 settings?.defaultCycleLength !== 32 && 
                 settings?.defaultCycleLength !== 33 && 
                 settings?.defaultCycleLength !== 34 && 
                 settings?.defaultCycleLength !== 35 && (
                  <span className="text-xs text-muted-foreground">Custom: {settings?.defaultCycleLength} days</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Default Period Length</span>
              <div className="flex items-center gap-2">
                <Select 
                  defaultValue={settings?.defaultPeriodLength?.toString() || "5"}
                  onValueChange={handlePeriodLengthChange}
                >
                  <SelectTrigger className="w-[110px] h-8 text-sm bg-muted">
                    <SelectValue placeholder="Period length" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(days => (
                      <SelectItem key={days} value={days.toString()}>{days} days</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {settings?.defaultPeriodLength !== 2 &&
                 settings?.defaultPeriodLength !== 3 &&
                 settings?.defaultPeriodLength !== 4 &&
                 settings?.defaultPeriodLength !== 5 &&
                 settings?.defaultPeriodLength !== 6 &&
                 settings?.defaultPeriodLength !== 7 &&
                 settings?.defaultPeriodLength !== 8 &&
                 settings?.defaultPeriodLength !== 9 &&
                 settings?.defaultPeriodLength !== 10 && (
                  <span className="text-xs text-muted-foreground">Custom: {settings?.defaultPeriodLength} days</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">Show PMDD Symptoms on Today Page</span>
              <Switch checked={showPmddSymptoms} onCheckedChange={handlePmddToggle} />
            </div>
            <div className="mb-8 mt-8 border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-3 text-red-700">Danger Zone</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 bg-red-50 border border-red-200 p-4 rounded-md">
                  <span className="text-sm font-medium text-red-700">Import Backup (JSON)</span>
                  <span className="text-xs text-red-600">Warning: You should reset all data before importing a backup to avoid data merging or duplication. Importing a backup will not automatically reset your data.</span>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportJSON}
                    className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200 mt-2"
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-red-600">Reset All Data</span>
                  <Button variant="destructive" size="sm" onClick={handleResetData} disabled={resetDataMutation.isPending}>
                    {resetDataMutation.isPending ? 'Resetting...' : 'Reset Data'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Reset</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your logs, cycles, symptoms, and settings. This cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReset}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              autoFocus
              className="bg-destructive text-destructive-foreground hover:bg-red-600 hover:text-white"
            >
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppSettings;
