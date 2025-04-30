import React from 'react';
import SmilePlusIcon from '@/icons/SmilePlusIcon';
import SmileIcon from '@/icons/SmileIcon';
import MehIcon from '@/icons/MehIcon';
import FrownIcon from '@/icons/FrownIcon';
import AnnoyedIcon from '@/icons/AnnoyedIcon';

type MoodType = 'great' | 'good' | 'okay' | 'bad' | 'awful';

interface MoodSelectorProps {
  currentMood?: MoodType;
  onMoodSelect: (mood: MoodType) => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ currentMood, onMoodSelect }) => {
  return (
    <div className="flex justify-between">
      <MoodButton 
        mood="great" 
        label="Great" 
        icon={<SmilePlusIcon className="text-2xl text-yellow-500" />}  
        isActive={currentMood === 'great'} 
        onClick={() => onMoodSelect('great')} 
      />
      
      <MoodButton 
        mood="good" 
        label="Good" 
        icon={<SmileIcon className="text-2xl text-green-400" />}  
        isActive={currentMood === 'good'} 
        onClick={() => onMoodSelect('good')} 
      />
      
      <MoodButton 
        mood="okay" 
        label="Okay" 
        icon={<MehIcon className="text-2xl text-blue-400" />}  
        isActive={currentMood === 'okay'} 
        onClick={() => onMoodSelect('okay')} 
      />
      
      <MoodButton 
        mood="bad" 
        label="Bad" 
        icon={<FrownIcon className="text-2xl text-orange-400" />}  
        isActive={currentMood === 'bad'} 
        onClick={() => onMoodSelect('bad')} 
      />
      
      <MoodButton 
        mood="awful" 
        label="Awful" 
        icon={<AnnoyedIcon className="text-2xl text-red-500" />}  
        isActive={currentMood === 'awful'} 
        onClick={() => onMoodSelect('awful')} 
      />
    </div>
  );
};

// Individual mood button component
interface MoodButtonProps {
  mood: MoodType;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const MoodButton: React.FC<MoodButtonProps> = ({ mood, label, icon, isActive, onClick }) => {
  // Use theme CSS variables for active/inactive backgrounds and borders
  return (
    <div className="flex flex-col items-center">
      <button 
        className={`p-2 rounded-full ripple border-2 transition-colors duration-150
          ${isActive ? 'bg-primary border-accent shadow-lg text-primary-foreground' : 'bg-card border-muted text-foreground hover:bg-accent/30'}
        `}
        style={isActive ? { boxShadow: '0 0 0 3px hsl(var(--accent) / 0.5)' } : {}}
        onClick={onClick}
        aria-label={`Select mood: ${label}`}
      >
        {icon}
      </button>
      <span className={`text-xs mt-1 ${isActive ? 'font-bold text-accent' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
};

export default MoodSelector;
