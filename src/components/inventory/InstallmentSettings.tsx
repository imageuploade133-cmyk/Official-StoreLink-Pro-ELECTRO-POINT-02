'use client';

import React, { useMemo } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator,
  Loader2,
  Calendar,
  DollarSign,
  CalendarDays,
  Info,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, convertToDateSafely } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import type { InstallmentPlan, InstallmentInterval } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const installmentSchema = z.object({
  enabled: z.boolean().default(false),
  downPaymentPercent: z.coerce.number().min(0).max(100).default(25),
  numberOfPayments: z.coerce.number().int().min(2).max(52).default(4),
  interval: z.enum(['daily', 'weekly', 'monthly', 'custom']).default('weekly'),
  customIntervalDays: z.coerce.number().int().min(1).max(365).optional().default(14),
  startDate: z.date().optional().nullable(),
  lateFee: z.coerce.number().min(0).optional().nullable(),
  terms: z.string().optional().or(z.literal('')),
});

export type InstallmentFormValues = z.infer<typeof installmentSchema>;

interface InstallmentSettingsProps {
  sellingPrice: number;
  productName?: string;
  onValuesChange?: (values: InstallmentFormValues, calculatedPlan: CalculatedPlan | null) => void;
}

export interface CalculatedPlan {
  downPaymentAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  totalAmount: number;
  schedulePreview: SchedulePreviewItem[];
  effectiveStartDate: Date;
}

interface SchedulePreviewItem {
  number: number;
  dueDate: Date;
  label: string;
}

export function calculateInstallmentSchedule(
  sellingPrice: number,
  plan: InstallmentFormValues
): CalculatedPlan | null {
  if (!plan.enabled || sellingPrice <= 0) return null;

  const downPaymentAmount = sellingPrice * (plan.downPaymentPercent / 100);
  const remainingAmount = sellingPrice - downPaymentAmount;
  const installmentAmount = remainingAmount / plan.numberOfPayments;

  // Calculate start date
  let effectiveStartDate: Date;
  if (plan.startDate) {
    effectiveStartDate = plan.startDate;
  } else {
    effectiveStartDate = new Date();
  }

  // Generate schedule preview (first 3 installments)
  const schedulePreview: SchedulePreviewItem[] = [];
  for (let i = 0; i < Math.min(3, plan.numberOfPayments); i++) {
    let dueDate: Date;
    switch (plan.interval) {
      case 'daily':
        dueDate = addDays(effectiveStartDate, i + 1);
        break;
      case 'weekly':
        dueDate = addWeeks(effectiveStartDate, i + 1);
        break;
      case 'monthly':
        dueDate = addMonths(effectiveStartDate, i + 1);
        break;
      case 'custom':
        const days = plan.customIntervalDays || 14;
        dueDate = addDays(effectiveStartDate, days * (i + 1));
        break;
    }
    schedulePreview.push({
      number: i + 1,
      dueDate,
      label: format(dueDate, 'MMM dd, yyyy'),
    });
  }

  return {
    downPaymentAmount,
    remainingAmount,
    installmentAmount,
    totalAmount: sellingPrice,
    schedulePreview,
    effectiveStartDate,
  };
}

export function InstallmentSettings({ sellingPrice, productName, onValuesChange }: InstallmentSettingsProps) {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  
  const form = useForm<InstallmentFormValues>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      enabled: false,
      downPaymentPercent: 25,
      numberOfPayments: 4,
      interval: 'weekly',
      customIntervalDays: 14,
      startDate: null,
      lateFee: null,
      terms: '',
    },
  });

  const watchEnabled = form.watch('enabled');
  const watchDownPayment = form.watch('downPaymentPercent');
  const watchNumberOfPayments = form.watch('numberOfPayments');
  const watchInterval = form.watch('interval');
  const watchCustomDays = form.watch('customIntervalDays');
  const watchStartDate = form.watch('startDate');

  const calculatedPlan = useMemo(() => {
    if (!watchEnabled || sellingPrice <= 0) return null;
    return calculateInstallmentSchedule(sellingPrice, form.getValues());
  }, [watchEnabled, sellingPrice, watchDownPayment, watchNumberOfPayments, watchInterval, watchCustomDays, watchStartDate]);

  // Notify parent of changes
  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange(form.getValues(), calculatedPlan);
    }
  }, [form.getValues(), calculatedPlan, onValuesChange]);

  const intervalLabels: Record<InstallmentInterval, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    custom: 'Custom (every X days)',
  };

  const getIntervalDescription = (interval: InstallmentInterval, customDays?: number) => {
    switch (interval) {
      case 'daily': return 'Payments due every day';
      case 'weekly': return 'Payments due every 7 days';
      case 'monthly': return 'Payments due every month on the same date';
      case 'custom': return `Payments due every ${customDays || 14} days`;
    }
  };

  return (
    <Card className={cn("shadow-xl border-none ring-1 ring-border transition-all", !watchEnabled && "opacity-70")}>
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pay Small Small / Installments
            </CardTitle>
            <CardDescription>
              Enable customers to pay for this product in affordable installments
            </CardDescription>
          </div>
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <Label htmlFor="installment-toggle" className="text-sm font-medium cursor-pointer">
                  {field.value ? 'Active' : 'Inactive'}
                </Label>
                <FormControl>
                  <Switch 
                    id="installment-toggle"
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardHeader>
      
      <CardContent className={cn("pt-6 space-y-6 transition-opacity", !watchEnabled && "opacity-40 pointer-events-none")}>
        {/* Product Price Reference */}
        <div className="bg-muted/30 p-4 rounded-xl border border-dashed">
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Product Price: </span>
            <span className="font-bold text-primary">{currencySymbol}{sellingPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Down Payment */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="downPaymentPercent"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="font-bold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Down Payment Percentage
                  </FormLabel>
                  <div className="bg-primary/10 px-3 py-1 rounded-full">
                    <span className="text-primary font-black text-lg">{field.value}%</span>
                  </div>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    min={0}
                    max={50}
                    step={5}
                    className="py-2"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0% (Full balance)</span>
                  <span>50% (Half now)</span>
                </div>
                <FormDescription>
                  Initial payment required to start the installment plan
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Number of Payments and Interval */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="numberOfPayments"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Number of Payments
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={2} 
                    max={52} 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? 4 : parseInt(e.target.value) || 4)}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Between 2 and 52 installments
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interval"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Payment Interval
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(intervalLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {getIntervalDescription(field.value as InstallmentInterval, watchCustomDays)}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Custom Interval Days */}
        {watchInterval === 'custom' && (
          <FormField
            control={form.control}
            name="customIntervalDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Custom Interval (Days)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1} 
                    max={365} 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? 14 : parseInt(e.target.value) || 14)}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Number of days between each payment
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Start Date */}
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                First Payment Start Date
              </FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                    field.onChange(date);
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Leave empty to start from today
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Late Fee */}
        <FormField
          control={form.control}
          name="lateFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Late Fee (Optional)
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value) || null)}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Charge this amount when a payment is overdue (leave empty to disable)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Terms */}
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Terms & Conditions
              </FormLabel>
              <FormControl>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter terms and conditions for the installment plan..."
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription className="text-xs">
                These terms will be shown to customers before they start an installment plan
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Calculated Preview */}
        {calculatedPlan && watchEnabled && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-primary" />
              <h4 className="font-black text-sm uppercase tracking-wider text-primary">Calculated Plan Preview</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-black/50 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Down Payment</span>
                <p className="text-2xl font-black text-green-600">
                  {currencySymbol}{calculatedPlan.downPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-muted-foreground">({watchDownPayment}% of total)</span>
              </div>
              
              <div className="bg-white dark:bg-black/50 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Per Installment</span>
                <p className="text-2xl font-black text-primary">
                  {currencySymbol}{calculatedPlan.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-muted-foreground">x {watchNumberOfPayments} payments</span>
              </div>
            </div>

            <div className="bg-white dark:bg-black/50 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schedule Preview</span>
              <div className="space-y-2">
                {calculatedPlan.schedulePreview.map((item) => (
                  <div key={item.number} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-lg">
                    <span className="font-medium">Installment #{item.number}</span>
                    <span className="font-bold text-muted-foreground">{item.label}</span>
                  </div>
                ))}
                {watchNumberOfPayments > 3 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    + {watchNumberOfPayments - 3} more payment(s)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-primary/20">
              <span className="text-sm font-bold">Total to Pay</span>
              <span className="text-2xl font-black text-primary">
                {currencySymbol}{calculatedPlan.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InstallmentSettings;