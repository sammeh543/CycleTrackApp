import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, subDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface DateNavProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  userId?: number;
}

const DateNav: React.FC<DateNavProps> = ({ selectedDate, onDateChange, userId = 1 }) => {
  const [open, setOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate);
  const today = new Date();
  
  // Fetch flow records to mark period days in the calendar
  const { data: flowRecords } = useQuery({
    queryKey: ['/api/flow-records', userId],
    queryFn: () => fetch(`/api/flow-records?userId=${userId}`).then(res => res.json()),
    enabled: !!userId
  });
  
  // Fetch symptom records to mark days with symptoms
  const { data: symptomRecords } = useQuery({
    queryKey: ['/api/symptom-records', userId],
    queryFn: () => fetch(`/api/symptom-records?userId=${userId}`).then(res => res.json()),
    enabled: !!userId
  });
  
  // Function to check if a date has data
  const hasDataForDay = (day: Date) => {
    // Check for flow records
    const hasFlow = flowRecords?.some((record: any) => {
      const recordDate = parseISO(record.date);
      return isSameDay(day, recordDate);
    });
    
    // Check for symptom records
    const hasSymptoms = symptomRecords?.some((record: any) => {
      const recordDate = parseISO(record.date);
      return isSameDay(day, recordDate);
    });
    
    return { hasFlow, hasSymptoms };
  };
  
  const goToToday = () => {
    onDateChange(today);
  };
  
  const goToPreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };
  
  const goToNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };
  
  const isToday = isSameDay(selectedDate, today);
  const isFutureDate = selectedDate > today;
  
  // When popover opens, sync calendarMonth to selectedDate
  useEffect(() => {
    if (open) {
      setCalendarMonth(selectedDate);
    }
  }, [open, selectedDate]);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-auto justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "LLL d, yyyy") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarMonth(date); // keep month in sync with selected date
                  setOpen(false);
                }
              }}
              initialFocus
              components={{
                DayContent: (props) => {
                  const { hasFlow, hasSymptoms } = hasDataForDay(props.date);
                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <span>{props.date.getDate()}</span>
                      <div className="absolute bottom-1 flex space-x-1 justify-center">
                        {hasFlow && (
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                        )}
                        {hasSymptoms && (
                          <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                        )}
                      </div>
                    </div>
                  );
                },
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousDay}
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {!isToday && (
          <Button
            variant="outline"
            onClick={goToToday}
            className="text-xs"
          >
            Today
          </Button>
        )}
        
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextDay}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DateNav;