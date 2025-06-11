import { useState } from "react";
import Calendar from "react-calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CalendarPickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CalendarPicker({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  className,
  disabled = false 
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  
  const selectedDate = value ? new Date(value) : null;

  const handleDateChange = (date: Value) => {
    if (date && !Array.isArray(date)) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            className="react-calendar-custom"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}