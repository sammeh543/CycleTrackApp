import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

// Define mood scale types
enum MoodScaleType {
  STANDARD = 'standard',  // Happy, Neutral, Sad
  DETAILED = 'detailed',  // Very Happy, Happy, Neutral, Sad, Very Sad
  NUMERICAL = 'numerical', // 1-10 scale
}

interface MoodCustomizationProps {
  userId: number;
  initialSettings?: {
    moodScale: MoodScaleType;
    enableMoodNotes: boolean;
  };
}

const MoodCustomization: React.FC<MoodCustomizationProps> = ({ 
  userId, 
  initialSettings = { moodScale: MoodScaleType.STANDARD, enableMoodNotes: true } 
}) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState(initialSettings);
  
  // Mutation to update mood settings
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: typeof settings) => {
      return fetch(`/api/user-settings/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          moodScaleType: newSettings.moodScale,
          enableMoodNotes: newSettings.enableMoodNotes,
        }),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update settings');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your mood tracking preferences have been saved.",
        duration: 3000
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
  
  const handleScaleChange = (value: MoodScaleType) => {
    const newSettings = { ...settings, moodScale: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };
  
  const handleNotesToggle = (checked: boolean) => {
    const newSettings = { ...settings, enableMoodNotes: checked };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Mood Tracking Preferences</CardTitle>
        <CardDescription>
          Customize how you track and display your moods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Mood Scale Type</h4>
            <RadioGroup 
              value={settings.moodScale} 
              onValueChange={(v) => handleScaleChange(v as MoodScaleType)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={MoodScaleType.STANDARD} id="scale-standard" />
                <Label htmlFor="scale-standard" className="font-normal cursor-pointer">
                  Standard (Happy, Neutral, Sad)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={MoodScaleType.DETAILED} id="scale-detailed" />
                <Label htmlFor="scale-detailed" className="font-normal cursor-pointer">
                  Detailed (5 levels of mood)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={MoodScaleType.NUMERICAL} id="scale-numerical" />
                <Label htmlFor="scale-numerical" className="font-normal cursor-pointer">
                  Numerical (1-10 scale)
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mood-notes">Enable Mood Notes</Label>
                <p className="text-xs text-muted-foreground">
                  Add a short note when logging your mood
                </p>
              </div>
              <Switch
                id="mood-notes"
                checked={settings.enableMoodNotes}
                onCheckedChange={handleNotesToggle}
              />
            </div>
          </div>
          
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-3">Preview</h4>
            <div className="p-4 bg-muted rounded-md">
              <div className="grid grid-cols-1 gap-2">
                {settings.moodScale === MoodScaleType.STANDARD && (
                  <div className="flex justify-between">
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😊</span>
                      <span className="text-xs mt-1">Happy</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😐</span>
                      <span className="text-xs mt-1">Neutral</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😔</span>
                      <span className="text-xs mt-1">Sad</span>
                    </div>
                  </div>
                )}
                
                {settings.moodScale === MoodScaleType.DETAILED && (
                  <div className="flex justify-between">
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😁</span>
                      <span className="text-xs mt-1">Very Happy</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😊</span>
                      <span className="text-xs mt-1">Happy</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😐</span>
                      <span className="text-xs mt-1">Neutral</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😔</span>
                      <span className="text-xs mt-1">Sad</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl">😢</span>
                      <span className="text-xs mt-1">Very Sad</span>
                    </div>
                  </div>
                )}
                
                {settings.moodScale === MoodScaleType.NUMERICAL && (
                  <div className="space-y-3">
                    <div className="flex justify-between px-2">
                      <span className="text-xs">Negative</span>
                      <span className="text-xs">Positive</span>
                    </div>
                    <div className="flex justify-between">
                      {Array.from({length: 10}).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-sm font-medium">{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {settings.enableMoodNotes && (
                  <div className="mt-4 bg-card rounded-sm px-3 py-2 text-xs text-muted-foreground border border-dashed border-border">
                    Optional note about your mood today...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MoodCustomization;