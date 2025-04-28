import React from 'react';
import { useLocation } from 'wouter';
import useMobileSwipe from '@/hooks/use-mobile-swipe';
import { Calendar, BarChart3, Settings, CalendarCheck } from 'lucide-react';

const Navbar: React.FC = () => {
  const [location, setLocation] = useLocation();
  
  // Set up swipe navigation between tabs
  const tabs = ["/today", "/calendar", "/analysis", "/settings"];
  
  const getCurrentIndex = () => {
    const currentPath = location.startsWith('/') ? location : '/' + location;
    return tabs.indexOf(currentPath);
  };
  
  const { containerProps } = useMobileSwipe({
    threshold: 50,
    onSwipeLeft: () => {
      const currentIndex = getCurrentIndex();
      if (currentIndex < tabs.length - 1) {
        setLocation(tabs[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      const currentIndex = getCurrentIndex();
      if (currentIndex > 0) {
        setLocation(tabs[currentIndex - 1]);
      }
    }
  });
  
  return (
    <>
      <div {...containerProps} className="fixed top-[56px] left-0 right-0 bottom-0 z-[-1]" />
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg max-w-md mx-auto rounded-t-2xl px-2">
        <div className="flex justify-around">
          <button 
            className={`bottom-nav-btn ${location === "/today" ? "active" : ""}`}
            onClick={() => setLocation("/today")}
          >
            <CalendarCheck className="h-5 w-5" />
            <span className="text-xs mt-1">Today</span>
          </button>
          <button 
            className={`bottom-nav-btn ${location === "/calendar" ? "active" : ""}`}
            onClick={() => setLocation("/calendar")}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs mt-1">Calendar</span>
          </button>
          <button 
            className={`bottom-nav-btn ${location === "/analysis" ? "active" : ""}`}
            onClick={() => setLocation("/analysis")}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs mt-1">Analysis</span>
          </button>
          <button 
            className={`bottom-nav-btn ${location === "/settings" ? "active" : ""}`}
            onClick={() => setLocation("/settings")}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
