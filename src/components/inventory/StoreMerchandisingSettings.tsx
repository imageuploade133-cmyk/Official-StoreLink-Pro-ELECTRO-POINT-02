
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  BellRing, 
  CheckCircle2,
  Sparkles,
  TrendingUp,
  History,
  Tag,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { PromoSettings } from './PromoSettings';
import { Separator } from '@/components/ui/separator';

export function StoreMerchandisingSettings() {
  const { control, watch } = useFormContext();
  const { settings } = useSettings();

  return (
    <div className="space-y-6">
      {/* Merchandising Labels */}
      <div className="space-y-4">
        <h4 className="text font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-primary" /> Merchandising Labels
        </h4>
        
        {/* New Arrival Toggle */}
        <FormField
          control={control}
          name="isNewArrival"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 transition-colors group hover:border-indigo-200">
              <div className="space-y-0.5">
                <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className={cn("h-4 w-4", field.value ? "text-indigo-500" : "text-muted-foreground")} />
                  New Arrival
                </FormLabel>
                <p className="text text-muted-foreground">Show fresh inventory tag</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Popular Toggle */}
        <FormField
          control={control}
          name="isPopular"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-rose-50/30 dark:bg-rose-950/10 transition-colors group hover:border-rose-200">
              <div className="space-y-0.5">
                <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className={cn("h-4 w-4", field.value ? "text-rose-500" : "text-muted-foreground")} />
                  Popular Choice
                </FormLabel>
                <p className="text text-muted-foreground">Flag as "Best Seller"</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Old Stock Toggle */}
        <FormField
          control={control}
          name="isOldStock"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-slate-50 dark:bg-slate-900 transition-colors group hover:border-slate-300">
              <div className="space-y-0.5">
                <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <History className={cn("h-4 w-4", field.value ? "text-slate-500" : "text-muted-foreground")} />
                  Old Stock
                </FormLabel>
                <p className="text text-muted-foreground">Highlight as clearance</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <Separator />

      {/* Official Brand Toggle */}
      <FormField
        control={control}
        name="isOfficialBrand"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-primary/5 transition-colors group hover:border-primary/30">
            <div className="space-y-0.5">
              <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className={cn("h-4 w-4", field.value ? "text-primary" : "text-muted-foreground")} />
                Official Brand Item
              </FormLabel>
              <p className="text text-muted-foreground">Show "Verified Brand" badge on storefront</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Reward Ads Toggle */}
      <FormField
        control={control}
        name="rewardAdsEnabled"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 transition-colors group hover:border-amber-200">
            <div className="space-y-0.5">
              <FormLabel className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <Gift className={cn("h-4 w-4", field.value ? "text-amber-500" : "text-muted-foreground")} />
                Reward Ads Monetization
              </FormLabel>
              <p className="text text-muted-foreground">Allow customers to unlock discounts via ads</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Stock Alerts */}
      <div className="space-y-4">
        <h4 className="text font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
          <BellRing className="h-3.5 w-3.5 text-orange-500" /> Web Stock Alerts
        </h4>
        <FormField
          control={control}
          name="lowStockThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold">Custom Alert Threshold</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={`Global Default (${settings?.lowStockThreshold ?? 10})`}
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  className="h-10 text-sm"
                />
              </FormControl>
              <FormDescription className="text">Overrides business-wide alert setting if specified.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Discount Manager - Extracted Component */}
      <PromoSettings />
    </div>
  );
}
