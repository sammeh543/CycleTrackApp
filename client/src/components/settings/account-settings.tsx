import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AccountSettingsProps {
  userId: number;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ userId }) => {
  const [name, setName] = useState('Jane Doe');
  const [email, setEmail] = useState('jane.doe@example.com');
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user settings
  const { data: settings, isLoading } = useQuery({
    queryKey: [`/api/user-settings/${userId}`],
    enabled: userId > 0
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: any) => {
      return apiRequest('PATCH', `/api/user-settings/${userId}`, updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-settings/${userId}`] });
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

  // Handle toggle change for notification settings
  const handleToggleChange = (key: string) => (checked: boolean) => {
    updateSettingsMutation.mutate({ [key]: checked });
  };

  // Handle profile update (now actually saves to backend)
  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ name, email }, {
      onSuccess: () => {
        setDialogOpen(false);
        toast({
          title: 'Profile updated',
          description: 'Your profile information has been saved.',
          duration: 3000
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
      }
    });
  };

  // Populate name/email from settings on load
  useEffect(() => {
    if (settings) {
      if (settings.name) setName(settings.name);
      if (settings.email) setEmail(settings.email);
    }
  }, [settings]);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-3">Account</h3>
          <div className="flex justify-center my-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-3">Account</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
              {name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="ml-3">
              <div className="font-medium">{name}</div>
              <div className="text-sm text-muted-foreground">{email}</div>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto rounded-full">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-card-foreground">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Update your account information.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProfileUpdate}>
                  <div className="space-y-4 my-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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
          {showDevSettings && (
            <div className="border-t border-border pt-4 mt-4">
              <div className="text-sm font-medium mb-2 text-orange-600">Email Notifications (Unfinished/Dev Only)</div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Period Reminders</span>
                <Switch 
                  checked={settings?.reminderEnabled ?? true}
                  onCheckedChange={handleToggleChange('reminderEnabled')}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Fertile Window Alerts</span>
                <Switch 
                  checked={settings?.fertileWindowAlerts ?? false}
                  onCheckedChange={handleToggleChange('fertileWindowAlerts')}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Weekly Summary Reports</span>
                <Switch 
                  checked={settings?.weeklySummary ?? true}
                  onCheckedChange={handleToggleChange('weeklySummary')}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">These features are unfinished and only visible in dev mode.</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSettings;
