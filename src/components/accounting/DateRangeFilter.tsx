'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateChange: (dateRange: DateRange | undefined) => void;
}

export function DateRangeFilter({ dateRange, onDateChange }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<'last7' | 'last30' | 'custom'>('last7');

  const handleDatePresetChange = (preset: 'last7' | 'last30') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'last7') {
      onDateChange({ from: subDays(now, 6), to: now });
    } else if (preset === 'last30') {
      onDateChange({ from: subDays(now, 29), to: now });
    }
  };

  const handleCustomDateChange = (newDate: DateRange | undefined) => {
    onDateChange(newDate);
    setActivePreset('custom');
  };

  return (
    <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
            <Button variant={activePreset === 'last7' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last7')}>Last 7 Days</Button>
            <Button variant={activePreset === 'last30' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last30')}>Last 30 Days</Button>
        </div>
        <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal h-9", !dateRange && "text-muted-foreground", activePreset === 'custom' && "border-primary ring-1 ring-primary")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={handleCustomDateChange} numberOfMonths={2} />
            </PopoverContent>
        </Popover>
    </div>
  )
}
