'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Zap, 
  TrendingDown,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { Card, CardContent } from '@/components/ui/card';

export function PromoSettings() {
  const { control, watch, setValue } = useFormContext();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const isPromoEnabled = watch('isPromo');

  return (
    <div className="pt-4 border-t border-dashed space-y-4">
      <div className="flex items-center justify-between">
          <h4 className="text font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-current" /> Promotional Pricing
          </h4>
          <FormField
              control={control}
              name="isPromo"
              render={({ field }) => (
                  <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
              )}
          />
      </div>

      {isPromoEnabled && (
        <Card className="border-amber-200 bg-amber-50/10  animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="pt-6 space-y-6">
            <FormField
              control={control}
              name="promoType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-bold uppercase">Discount Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="percentage" id="p-perc" /></FormControl>
                        <Label htmlFor="p-perc" className="font-medium text-xs cursor-pointer">Percentage (%)</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="fixed" id="p-fix" /></FormControl>
                        <Label htmlFor="p-fix" className="font-medium text-xs cursor-pointer">Fixed Amount ({currencySymbol})</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="promoValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Value</FormLabel>
                  <FormControl>
                      <div className="relative">
                          <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
                          <Input type="number" step="0.01" placeholder="e.g., 15" {...field} value={field.value ?? ''} className="pl-9 h-10 border-amber-200" />
                      </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="promoStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-bold uppercase flex justify-between items-center">
                        Start Date
                        {field.value && <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setValue('promoStartDate', null)}><X className="h-3 w-3" /></Button>}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-10 text-xs border-amber-200", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : "No start date (Always)"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="promoEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-bold uppercase flex justify-between items-center">
                        End Date
                        {field.value && <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setValue('promoEndDate', null)}><X className="h-3 w-3" /></Button>}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-10 text-xs border-amber-200", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : "No end date (Indefinite)"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} disabled={(date) => {
                            const start = watch('promoStartDate');
                            return date < (start || new Date("1900-01-01"));
                        }} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text text-amber-600 font-medium italic">
                Leave dates empty to keep the promotion active indefinitely.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
