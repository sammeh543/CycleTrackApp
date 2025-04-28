import React, { useState, useEffect } from 'react';

interface CustomSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  className?: string;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(value);
  
  // Sync with parent component value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setLocalValue(newValue);
    onChange(newValue);
  };
  
  // Calculate the percentage for background gradient
  const percentage = ((localValue - min) / (max - min)) * 100;
  
  return (
    <div className={`relative w-full ${className}`}>
      {/* Gradient bar */}
      <div className="h-6 w-full relative rounded-full bg-muted">
        {/* Colored progress */}
        <div 
          className="absolute top-0 left-0 h-full rounded-full bg-primary opacity-50" 
          style={{ 
            width: `${percentage}%`,
          }}
        />
        
        {/* Slider input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {/* Thumb indicator (visible circle) */}
        <div 
          className="absolute top-0 h-full aspect-square rounded-full bg-primary border-2 border-white shadow-sm z-5 flex items-center justify-center"
          style={{ 
            left: `calc(${percentage}% - 12px)`,
          }}
        >
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default CustomSlider;