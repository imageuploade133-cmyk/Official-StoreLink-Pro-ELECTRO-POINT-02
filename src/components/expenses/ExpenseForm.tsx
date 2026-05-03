'use client';

import React, { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { Loader2, PlusCircle, CalendarIcon, AlertTriangle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format as formatDate } from 'date-fns';

const expenseCategories = [
  'Rent/Lease', 'Utilities (Electricity, Water)', 'Salaries & Wages', 'Supplies (Office, Cleaning)',
  'Inventory Purchase', 'Marketing & Advertising', 'Repairs & Maintenance', 'Taxes', 'Bank Charges', 'Transportation', 'Other'
];

const expenseSchema = z.object({
  description: z.string().min(3, "Description must be at least 3 characters."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  category: z.string().min(1, "Please select a category."),
  otherCategoryDescription: z.string().optional(),
  paymentMethod: z.string(),
  expenseDate: z.date({ required_error: "Expense date is required." }),
  notes: z.string().optional(),
  useMultipleAccounts: z.boolean().default(false),
  multiAccountPayments: z.array(z.object({
    method: z.string(),
    amount: z.coerce.number().min(0, "Amount cannot be negative."),
  })).optional(),
}).refine(data => {
    if (data.category === 'Other') {
        return !!data.otherCategoryDescription && data.otherCategoryDescription.trim().length > 2;
    }
    return true;
}, {
    message: "Please specify the 'Other' expense reason (min 3 chars).",
    path: ['otherCategoryDescription'],
}).refine(data => {
    if (data.useMultipleAccounts && data.multiAccountPayments) {
      const totalMultiAmount = data.multiAccountPayments.reduce((sum, p) => sum + p.amount, 0);
      return Math.abs(totalMultiAmount - data.amount) < 0.01;
    }
    return true;
}, {
    message: "The sum of payments from multiple accounts must equal the total expense amount.",
    path: ['multiAccountPayments'],
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onAddExpense: (values: ExpenseFormValues) => Promise<void>;
  isSubmitting: boolean;
  balanceByMethod: Record<string, number>;
}

export function ExpenseForm({ onAddExpense, isSubmitting, balanceByMethod }: ExpenseFormProps) {
    const { settings } = useSettings();
    const paymentMethods = useMemo(() => settings?.paymentMethods || [{ id: 'cash', name: 'Cash' }], [settings]);

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            description: '',
            amount: undefined,
            category: '',
            otherCategoryDescription: '',
            paymentMethod: paymentMethods[0]?.name || 'Cash',
            expenseDate: new Date(),
            notes: '',
            useMultipleAccounts: false,
            multiAccountPayments: paymentMethods.map(m => ({ method: m.name, amount: 0 })),
        },
    });

    const watchedCategory = useWatch({ control: form.control, name: 'category' });
    const useMultipleAccounts = useWatch({ control: form.control, name: 'useMultipleAccounts' });
    const watchedAmount = useWatch({ control: form.control, name: 'amount' }) || 0;
    const watchedPaymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
    
    const singleAccountBalance = balanceByMethod[watchedPaymentMethod] ?? 0;
    const isInsufficientForSingle = watchedAmount > singleAccountBalance;

    const multiAccountTotal = useMemo(() => {
        const payments = form.watch('multiAccountPayments');
        return (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [form.watch('multiAccountPayments')]);
    
    const isMultiAccountSumValid = Math.abs(multiAccountTotal - watchedAmount) < 0.01;
    const allAvailableFunds = Object.values(balanceByMethod).reduce((sum, bal) => sum + bal, 0);
    const isInsufficientOverall = watchedAmount > allAvailableFunds;

    const handleWhatsAppRequest = () => {
        if (!settings?.storeContact) {
            alert('Store contact number not set in settings.');
            return;
        }
        const neededAmount = watchedAmount - allAvailableFunds;
        const message = `URGENT FUND REQUEST from ${settings.storeName || 'StoreLink Pro'}:\n\n`
            + `An expense of ${formatCurrency(watchedAmount, settings.currency || '$')} needs to be paid.\n`
            + `Current available funds are short by ${formatCurrency(neededAmount, settings.currency || '$')}.\n\n`
            + `Please approve and transfer the required amount.\n`
            + `Expense Details: ${form.getValues('description')}\n`
            + `Category: ${form.getValues('category')}`;

        const whatsappUrl = `https://wa.me/${formatPhoneNumberForWhatsapp(settings.storeContact, settings.countryCode)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Record New Expense</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onAddExpense)} className="space-y-4">
                        <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Office rent for May" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="amount" control={form.control} render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="category" control={form.control} render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl><SelectContent>{expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        {watchedCategory === 'Other' && (
                            <FormField control={form.control} name="otherCategoryDescription" render={({ field }) => (
                                <FormItem><FormLabel>Please Specify "Other" Expense</FormLabel><FormControl><Input placeholder="Describe the expense reason" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        )}
                        
                        <FormField control={form.control} name="useMultipleAccounts" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>Use Multiple Accounts</FormLabel><p className="text-xs text-muted-foreground">Split this expense across multiple payment methods.</p></div>
                            </FormItem>
                        )}/>
                        
                        {useMultipleAccounts ? (
                            <Card className="p-4 bg-muted/20">
                                <div className="space-y-2">
                                {paymentMethods.map((method, index) => (
                                   <FormField key={method.id} control={form.control} name={`multiAccountPayments.${index}.amount`} render={({field}) => (
                                        <FormItem><FormLabel className="text-xs flex justify-between"><span>{method.name}</span> <span className="font-normal text-muted-foreground">(Bal: {formatCurrency(balanceByMethod[method.name] || 0, settings?.currency || '$')})</span></FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                        <FormMessage className="text-xs"/>
                                       </FormItem>
                                   )}/>
                                ))}
                                </div>
                                <FormMessage>{form.formState.errors.multiAccountPayments?.message}</FormMessage>
                            </Card>
                        ) : (
                            <FormField name="paymentMethod" control={form.control} render={({ field }) => (<FormItem><FormLabel>Payment Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a method..." /></SelectTrigger></FormControl><SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        )}
                        
                        {!useMultipleAccounts && isInsufficientForSingle && watchedAmount > 0 && (
                            <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/>Insufficient funds in '{watchedPaymentMethod}'. Balance: {formatCurrency(singleAccountBalance, settings?.currency || '$')}</Alert>
                        )}

                         {useMultipleAccounts && !isMultiAccountSumValid && watchedAmount > 0 && (
                             <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/>Total payments ({formatCurrency(multiAccountTotal, settings?.currency || '$')}) do not match expense amount ({formatCurrency(watchedAmount, settings?.currency || '$')}).</Alert>
                         )}

                        {isInsufficientOverall && watchedAmount > 0 && (
                            <Card className="p-4 border-destructive bg-destructive/5 text-center">
                                <CardHeader className="p-0 pb-2"><CardTitle className="text-base text-destructive flex items-center justify-center gap-2"><AlertTriangle /> Overall Funds Insufficient</CardTitle></CardHeader>
                                <CardContent className="p-0 text-sm">
                                    <p>Total available funds ({formatCurrency(allAvailableFunds, settings?.currency || '$')}) are less than the expense amount.</p>
                                    <Button type="button" variant="link" className="text-blue-600 h-auto p-0 mt-2" onClick={handleWhatsAppRequest}>
                                        <MessageSquare className="mr-2 h-4 w-4"/> Request Funds via WhatsApp
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <FormField name="expenseDate" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Expense Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? formatDate(field.value, "PPP") : "Pick a date"}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField name="notes" control={form.control} render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <Button type="submit" className="w-full" disabled={isSubmitting || (isInsufficientForSingle && !useMultipleAccounts) || (useMultipleAccounts && !isMultiAccountSumValid)}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Expense
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
