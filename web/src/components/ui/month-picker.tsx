'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  className?: string;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse YYYY-MM
  const [selectedYear, selectedMonth] = React.useMemo(() => {
    if (!value) return [new Date().getFullYear(), null];
    const parts = value.split('-');
    if (parts.length !== 2) return [new Date().getFullYear(), null];
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m)) return [new Date().getFullYear(), null];
    return [y, m - 1]; // 0-based month
  }, [value]);

  // Year state being viewed in the picker
  const [viewYear, setViewYear] = React.useState(selectedYear);

  // Sync viewYear when popover opens or value changes
  React.useEffect(() => {
    if (open) {
      setViewYear(selectedYear);
    }
  }, [open, selectedYear]);

  const handleMonthSelect = (monthIndex: number) => {
    const formattedMonth = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${formattedMonth}`);
    setOpen(false);
  };

  const handlePrevYear = () => setViewYear((prev) => prev - 1);
  const handleNextYear = () => setViewYear((prev) => prev + 1);

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const handleThisMonth = () => {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    onChange(`${today.getFullYear()}-${formattedMonth}`);
    setViewYear(today.getFullYear());
    setOpen(false);
  };

  // Format the label shown on the trigger button
  const triggerLabel = React.useMemo(() => {
    if (!value) return 'Select month';
    const parts = value.split('-');
    if (parts.length !== 2) return 'Select month';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m)) return 'Select month';
    
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-44 justify-between text-left font-normal border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground',
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {/* Header with year navigation */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-accent"
            onClick={handlePrevYear}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums select-none">
            {viewYear}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-accent"
            onClick={handleNextYear}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid of months */}
        <div className="grid grid-cols-4 gap-2 py-3">
          {MONTHS.map((month, index) => {
            const isSelected = viewYear === selectedYear && index === selectedMonth;
            const isCurrentMonth =
              viewYear === new Date().getFullYear() && index === new Date().getMonth();

            return (
              <Button
                key={month}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                type="button"
                className={cn(
                  'h-9 w-full text-xs font-normal transition-all duration-200 px-1',
                  isSelected && 'bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/95',
                  !isSelected && isCurrentMonth && 'border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10',
                  !isSelected && !isCurrentMonth && 'hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {month}
              </Button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-7 px-2 text-xs text-primary hover:text-primary/80"
            onClick={handleThisMonth}
          >
            This month
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
