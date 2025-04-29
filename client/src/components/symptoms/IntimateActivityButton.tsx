import React from 'react';
import { Button } from '@/components/ui/button';
import IntimateIcon from '@/icons/IntimateIcon'; // Uses default export

interface IntimateActivityButtonProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const IntimateActivityButton: React.FC<IntimateActivityButtonProps> = ({ active, onClick, disabled }) => {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="icon"
      className={`intimate-activity-btn ${active ? 'glow-btn bg-primary text-primary-foreground' : 'bg-primary/20 hover:bg-primary/30 border-primary text-primary'} transition-colors`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Log Intimate Activity"
    >
      <IntimateIcon className={`w-6 h-6`} />
    </Button>
  );
};

export default IntimateActivityButton;
