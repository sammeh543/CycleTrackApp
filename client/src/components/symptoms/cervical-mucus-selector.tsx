import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import WavesIcon from '@/icons/WavesIcon';
import DropletIcon from '@/icons/DropletIcon';
import CloudIcon from '@/icons/CloudIcon';
import SnowflakeIcon from '@/icons/SnowflakeIcon';
import CheckIcon from '@/icons/CheckIcon';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type CervicalMucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';

interface CervicalMucusSelectorProps {
  currentType?: CervicalMucusType;
  onTypeSelect: (type: CervicalMucusType) => void;
}

const CervicalMucusSelector: React.FC<CervicalMucusSelectorProps> = ({
  currentType,
  onTypeSelect
}) => {
  // Track the selected type internally
  const [selectedType, setSelectedType] = useState<CervicalMucusType | undefined>(currentType);

  // Sync internal selection when prop changes
  useEffect(() => {
    setSelectedType(currentType);
  }, [currentType]);

  // Handle type selection (with toggle functionality)
  const handleSelect = (type: CervicalMucusType) => {
    // If same type is clicked again, clear selection
    if (selectedType === type || currentType === type) {
      setSelectedType(undefined);
      onTypeSelect(undefined as any); // Cast for compatibility
    } else {
      setSelectedType(type);
      onTypeSelect(type);
    }
  };

  // Function to determine if a button is selected
  const isSelected = (type: CervicalMucusType) => {
    return selectedType === type || currentType === type;
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant={isSelected('dry') ? 'default' : 'outline'}
          className={cn(
            'justify-center cervical-mucus-btn',
            isSelected('dry') ? 'selected' : '',
            isSelected('dry') ? 'bg-primary' : 'bg-primary/10 hover:bg-primary/20 border-primary text-primary'
          )}
          onClick={() => handleSelect('dry')}
        >
          <SnowflakeIcon className="mr-1 h-4 w-4" fillOpacity={isSelected('dry') ? 0.5 : 0} />
          <span>Dry</span>
          {isSelected('dry') && <CheckIcon className="ml-1 h-3 w-3" />}
        </Button>
        
        <Button 
          variant={isSelected('sticky') ? 'default' : 'outline'}
          className={cn(
            'justify-center cervical-mucus-btn',
            isSelected('sticky') ? 'selected' : '',
            isSelected('sticky') ? 'bg-primary' : 'bg-primary/10 hover:bg-primary/20 border-primary text-primary'
          )}
          onClick={() => handleSelect('sticky')}
        >
          <CloudIcon className="mr-1 h-4 w-4" fillOpacity={isSelected('sticky') ? 0.5 : 0} />
          <span>Sticky</span>
          {isSelected('sticky') && <CheckIcon className="ml-1 h-3 w-3" />}
        </Button>
        
        <Button 
          variant={isSelected('creamy') ? 'default' : 'outline'}
          className={cn(
            'justify-center cervical-mucus-btn',
            isSelected('creamy') ? 'selected' : '',
            isSelected('creamy') ? 'bg-primary' : 'bg-primary/10 hover:bg-primary/20 border-primary text-primary'
          )}
          onClick={() => handleSelect('creamy')}
        >
          <CloudIcon className="mr-1 h-4 w-4" fillOpacity={isSelected('creamy') ? 0.5 : 0} />
          <span>Creamy</span>
          {isSelected('creamy') && <CheckIcon className="ml-1 h-3 w-3" />}
        </Button>
        
        <Button 
          variant={isSelected('watery') ? 'default' : 'outline'}
          className={cn(
            'justify-center cervical-mucus-btn',
            isSelected('watery') ? 'selected' : '',
            isSelected('watery') ? 'bg-primary' : 'bg-primary/10 hover:bg-primary/20 border-primary text-primary'
          )}
          onClick={() => handleSelect('watery')}
        >
          <DropletIcon className="mr-1 h-4 w-4" fillOpacity={isSelected('watery') ? 0.5 : 0} />
          <span>Watery</span>
          {isSelected('watery') && <CheckIcon className="ml-1 h-3 w-3" />}
        </Button>
      </div>
      
      <div className="mt-2">
        <Button 
          variant={isSelected('eggwhite') ? 'default' : 'outline'}
          className={cn(
            'justify-center w-full cervical-mucus-btn',
            isSelected('eggwhite') ? 'selected' : '',
            isSelected('eggwhite') ? 'bg-primary' : 'bg-primary/10 hover:bg-primary/20 border-primary text-primary'
          )}
          onClick={() => handleSelect('eggwhite')}
        >
          <WavesIcon className="mr-1 h-4 w-4" fillOpacity={isSelected('eggwhite') ? 0.5 : 0} />
          <span>Egg White (Fertile)</span>
          {isSelected('eggwhite') && <CheckIcon className="ml-1 h-3 w-3" />}
        </Button>
      </div>
      
      <Separator className="my-3" />
      
      <div className="text-sm text-muted-foreground text-center">
        <p>Tracking cervical mucus helps identify your fertile window.</p>
        <p>Egg white consistency typically indicates peak fertility.</p>
      </div>
    </div>
  );
};

export default CervicalMucusSelector;