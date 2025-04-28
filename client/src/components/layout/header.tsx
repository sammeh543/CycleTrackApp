import React from 'react';
import { Menu, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface HeaderProps {
  userId?: number;
}

const Header: React.FC<HeaderProps> = ({ userId = 1 }) => {
  return (
    <header className="flex justify-between items-center px-4 py-3 bg-card sticky top-0 z-10 shadow-md rounded-b-2xl max-w-md">
      <div className="flex items-center">
        <span className="text-primary mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lotus">
            <path d="M12 2a7.5 7.5 0 0 0-5 3c-3.7 4.5-3 11 5 12.5-8 1.5-8.5 8-8.5 8h17s-.5-6.5-8.5-8c8-1.5 8.7-8 5-12.5a7.5 7.5 0 0 0-5-3Z"/>
          </svg>
        </span>
        <h1 className="text-xl font-bold">CycleSense</h1>
      </div>
      <div className="flex items-center space-x-2">
        {/* Removed DataExport from header, as export is now handled in settings */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card text-card-foreground">
            <div className="py-4">
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              <div className="space-y-4">
                <p className="text-sm">
                  CycleSense helps you track your period, symptoms, and mood to better understand your menstrual cycle and PMDD symptoms.
                </p>
                <p className="text-sm">
                  Your data is stored <strong>locally</strong> on your device for privacy. You can export your data as a backup from the Settings page, and restore it at any time using the Import feature.
                </p>
                <p className="text-sm">
                  Choose your favorite theme in Settings. Your theme preference will be remembered automatically.
                </p>
              </div>
              <div className="border-t border-border mt-6 pt-6">
                <h4 className="text-sm font-medium mb-2">Data Storage & Backup</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Export your data regularly using the Settings page to avoid data loss. You can import a backup at any time to restore your logs, symptoms, and settings.
                </p>
                <h4 className="text-sm font-medium mb-2">Theme Customization</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Try out the Ocean, Beach, Starry, and other themes! Your choice will be saved for next time.
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
