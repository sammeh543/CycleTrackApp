import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Loader from "@/components/ui/loader";

import Today from "@/pages/today";
import Calendar from "@/pages/calendar";
import Analysis from "@/pages/analysis";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Navbar from "@/components/layout/navbar";
import { useEffect, useState } from "react";

// Custom hook to set desktop background on <body>
function useDesktopBackground(bgImage: string | null) {
  useEffect(() => {
    if (bgImage && window.innerWidth >= 768) {
      document.body.style.backgroundImage = `url('${bgImage}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundColor = 'black';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
    }
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
    };
  }, [bgImage]);
}

function Router() {
  const [location, setLocation] = useLocation();
  const [userId, setUserId] = useState<number | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);

  // For demo purposes, automatically set a user ID
  useEffect(() => {
    // In a real app, we would check for authentication here
    // For now, just set a default user ID for demonstration
    setUserId(1);
  }, []);

  // If no path is specified, redirect to /today
  useEffect(() => {
    if (location === "/") {
      setLocation("/today");
    }
  }, [location, setLocation]);

  useEffect(() => {
    const stored = localStorage.getItem('customBgImage');
    setBgImage(stored);
  }, []);

  useDesktopBackground(bgImage);

  // Simple wrapper to pass userId to all pages
  const renderWithUserId = (Component: React.ComponentType<{userId: number}>) => {
    if (userId === null) {
      return <Loader message="Loading CycleTrack2Surf..." />;
    }
    return <Component userId={userId} />;
  };

  return (
    <div
      className="flex flex-col h-screen max-w-md mx-auto relative"
      data-has-bg={!!bgImage}
    >
      <Header />
      <main className="flex-1 overflow-y-auto pb-20">
        <Switch>
          <Route path="/today" component={() => renderWithUserId(Today)} />
          <Route path="/calendar" component={() => renderWithUserId(Calendar)} />
          <Route path="/analysis" component={() => renderWithUserId(Analysis)} />
          <Route path="/settings" component={() => renderWithUserId(Settings)} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Navbar />
    </div>
  );
}

function App() {
  console.log("App rendering - version v5 - fixed symptom management");
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="fixed top-0 right-0 bg-black text-white text-xs p-1 z-50">v5</div>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

// Add a desktop-only style for the background image
// (in your global CSS, e.g., index.css or App.css):
//
// [data-has-bg="true"] {
//   background: none;
// }
// @media (min-width: 768px) {
//   [data-has-bg="true"] {
//     background: unset !important;
//   }
// }
