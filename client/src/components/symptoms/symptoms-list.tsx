import React, { useState, useEffect, useContext } from 'react';
import { 
  CheckCircle2, 
  Circle,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import CustomSlider from '@/components/ui/custom-slider';
import { cn } from '@/lib/utils';
import { ThemeContext } from "@/components/theme-provider";

interface Symptom {
  id: number;
  name: string;
  category: string;
}

interface SymptomsListProps {
  symptoms: Symptom[];
  activeSymptomIds: number[];
  onToggleSymptom: (id: number) => void;
  getSymptomIntensity?: (id: number) => number;
  updateSymptomIntensity?: (id: number, intensity: number) => void;
}

const SymptomsList: React.FC<SymptomsListProps> = ({ 
  symptoms, 
  activeSymptomIds, 
  onToggleSymptom,
  getSymptomIntensity,
  updateSymptomIntensity
}) => {
  const theme = useContext(ThemeContext)?.theme || "original";
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Show only first 8 symptoms by default
  const visibleSymptoms = showAllSymptoms ? symptoms : symptoms.slice(0, 8);
  
  // Handle add more button
  const handleShowMore = () => {
    setShowAllSymptoms(true);
  };
  
  return (
    <>
      <div className="flex flex-wrap gap-2 w-full">
        {visibleSymptoms.map(symptom => (
          <SymptomItem 
            key={symptom.id}
            symptom={symptom}
            isActive={activeSymptomIds.includes(symptom.id)}
            onToggle={() => onToggleSymptom(symptom.id)}
            intensity={getSymptomIntensity ? getSymptomIntensity(symptom.id) : 0}
            onIntensityChange={
              updateSymptomIntensity 
                ? (intensity) => updateSymptomIntensity(symptom.id, intensity) 
                : undefined
            }
            className={cn('symptom-btn flex-1 min-w-[45%]')}
          />
        ))}
      </div>
      
      {!showAllSymptoms && symptoms.length > 8 && (
        <Button
          variant="outline"
          className={cn(
            "w-full mt-3 border-dashed symptom-btn",
            theme === "pinkwhite" && "selected:bg-[hsl(var(--button-selected))] hover:bg-[hsl(var(--button-hover))] text-foreground",
            theme === "starry" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
            theme === "nebula" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
            theme === "galaxy" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
            theme === "aurora" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
            theme === "beach" && "hover:bg-[hsla(var(--scrollbar-thumb))] text-foreground"
          )}
          onClick={handleShowMore}
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>Show more symptoms</span>
        </Button>
      )}
      
      {/* Dialog for all symptoms (more organized view) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full mt-3 border-dashed symptom-btn",
              theme === "pinkwhite" && "selected:bg-[hsl(var(--button-selected))] hover:bg-[hsl(var(--button-hover))] text-foreground",
              theme === "starry" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
              theme === "nebula" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
              theme === "galaxy" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
              theme === "aurora" && "hover:bg-[hsl(var(--button-hover))] text-foreground",
              theme === "beach" && "hover:bg-[hsla(var(--scrollbar-thumb))] text-foreground"
            )}
          >
            <span>View all symptoms</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>All Symptoms</DialogTitle>
            <DialogDescription>
              Select the symptoms you're experiencing today.
            </DialogDescription>
          </DialogHeader>
          <Separator className="my-2" />
          <div className="max-h-[60vh] overflow-y-auto grid grid-cols-1 gap-2 pr-2">
            {symptoms.map(symptom => (
              <SymptomItem 
                key={symptom.id}
                symptom={symptom}
                isActive={activeSymptomIds.includes(symptom.id)}
                onToggle={() => {
                  onToggleSymptom(symptom.id);
                }}
                isCompact={false}
                intensity={getSymptomIntensity ? getSymptomIntensity(symptom.id) : 0}
                onIntensityChange={
                  updateSymptomIntensity 
                    ? (intensity) => updateSymptomIntensity(symptom.id, intensity) 
                    : undefined
                }
                className={cn('symptom-btn', activeSymptomIds.includes(symptom.id) ? 'selected' : '')}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Individual symptom item component
interface SymptomItemProps {
  symptom: Symptom;
  isActive: boolean;
  onToggle: () => void;
  isCompact?: boolean;
  intensity?: number;
  onIntensityChange?: (intensity: number) => void;
  className?: string;
}

const SymptomItem: React.FC<SymptomItemProps> = ({ 
  symptom, 
  isActive, 
  onToggle,
  isCompact = true,
  intensity = 0,
  onIntensityChange,
  className
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localIntensity, setLocalIntensity] = useState(intensity || 1);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Move this to the top to ensure it runs

    if (onIntensityChange && isActive) {
      // If we have the intensity feature and it's already active, expand instead of toggle
      setExpanded(!expanded);
    } else {
      // Toggle the symptom
      onToggle();
      // If we're activating and have intensity control, auto-expand
      if (!isActive && onIntensityChange) {
        setExpanded(true);
      }
    }
  };
  
  // Add a separate handler for unchecking an active symptom
  const handleUncheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      onToggle(); // This will deactivate the symptom
      setExpanded(false); // Close the intensity panel
    }
  };
  
  // Handle direct DOM events for slider dragging
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onIntensityChange) {
      const newValue = parseInt(event.target.value, 10);
      if (!isNaN(newValue)) {
        onIntensityChange(newValue);
      }
    }
  };

  // Fix the array so intensityLabels[1] is "Mild", etc.
  const intensityLabels = ["(None)", "Mild", "Moderate", "Severe", "Very severe"];
  
  // Sync with parent component's intensity
  useEffect(() => {
    setLocalIntensity(intensity || 1);
  }, [intensity]);
  
  return (
    <div className={cn(
      className,
      symptom.category === 'period' && 'period-status-btn',
      isActive && 'selected'
    )}>
      <div className={cn(
        'bg-card hover:bg-card/70 p-3 rounded-lg border border-border',
        'flex items-center justify-between ripple cursor-pointer',
        isActive ? (symptom.category === 'period' ? 'bg-primary/10 border-primary/50 period-status-btn selected' : 'bg-primary/10 border-primary/50 symptom-btn selected') : '',
        expanded ? 'rounded-b-none' : ''
      )}
        onClick={handleToggle}
      >
        <span className={symptom.category === 'period' ? 'period-status-label text-base' : 'symptom-label text-sm'}>{symptom.name}</span>
        <div className="flex items-center">
          {isActive ? (
            <>
              {onIntensityChange && (
                <span className="text-xs mr-2 px-1.5 py-0.5 bg-primary/20 rounded symptom-intensity-label">
                  {intensityLabels[localIntensity]}
                </span>
              )}
              {/* Add an X button to uncheck the symptom */}
              <button 
                className="text-red-500 hover:bg-red-100 rounded-full p-0.5 mr-1"
                onClick={handleUncheck}
                title="Remove symptom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </button>
              <CheckCircle2 className="h-4 w-4 symptom-intensity-label" />
              {onIntensityChange && (
                <ChevronDown className={cn("h-4 w-4 ml-1 symptom-intensity-label", expanded ? "rotate-180" : "")} />
              )}
            </>
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </div>
      </div>
      
      {/* Intensity slider (shown when expanded) */}
      {isActive && expanded && onIntensityChange && (
        <div className="p-3 pt-2 pb-4 bg-card border border-t-0 border-primary/50 rounded-b-lg">
          <div className="flex justify-between text-xs mb-1 px-1">
            <span>Mild</span>
            <span>Moderate</span>
            <span>Severe</span>
          </div>
          <CustomSlider
            value={localIntensity}
            min={1}
            max={4}
            step={1}
            onChange={(value) => {
              // Update both local state and parent
              setLocalIntensity(value);
              if (onIntensityChange) {
                onIntensityChange(value);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SymptomsList;
