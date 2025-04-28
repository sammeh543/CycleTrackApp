import React from 'react';
import AccountSettings from '@/components/settings/account-settings';
import AppSettings from '@/components/settings/app-settings';
import CustomSymptoms from '@/components/settings/custom-symptoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsProps {
  userId: number;
}

const Settings: React.FC<SettingsProps> = ({ userId }) => {
  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tracking">Customize</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            {/* App Settings */}
            <AppSettings userId={userId} />
          </TabsContent>
          
          <TabsContent value="tracking" id="tracking-tab">
            <h3 className="text-lg font-semibold mb-4">Customize Tracking</h3>
            
            {/* Custom Symptoms */}
            <CustomSymptoms userId={userId} />
          </TabsContent>
          
          <TabsContent value="account">
            {/* Account Settings */}
            <AccountSettings userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
