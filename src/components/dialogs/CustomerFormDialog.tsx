'use client';
import React, { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Phone } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  allowSms: z.boolean().default(true),
  allowWhatsapp: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent' | 'outstandingCredit' | 'status' | 'branchId'>) => Promise<void>;
  defaultValues: Customer | null;
  isSaving: boolean;
}

export function CustomerFormDialog({ open, onOpenChange, onSubmit, defaultValues, isSaving }: CustomerFormDialogProps) {
  const isEditing = !!defaultValues;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', email: '', phone: '', address: '',
      allowSms: true, allowWhatsapp: true,
    }
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name || '',
        email: defaultValues?.email || '',
        phone: defaultValues?.phone || '',
        address: defaultValues?.address || '',
        allowSms: defaultValues?.allowSms !== false,
        allowWhatsapp: defaultValues?.allowWhatsapp !== false,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: FormValues) => {
    const submissionValues = {
        ...values,
        status: defaultValues?.status || 'active', // Preserve status or default to active
    };
    onSubmit(submissionValues as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w h sm:w-full sm:max-w-lg sm:h-auto sm:max-h p-0 flex flex-col overflow-hidden border-none sm:border left-0 top-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
        <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isEditing ? `Update details for ${defaultValues?.name}.` : 'Fill in the details for the new customer.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} id="customer-form" className="space-y-4 py-2 sm:py-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-sm font-bold">Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isSaving} className="h-11" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-sm font-bold">Email Address (Optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} value={field.value ?? ''} disabled={isSaving} className="h-11" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-sm font-bold">Phone Number (Optional)</FormLabel>
                    <FormControl><Input type="tel" placeholder="08012345678" {...field} value={field.value ?? ''} disabled={isSaving} className="h-11" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-sm font-bold">Address (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="123 Main St, Anytown..." {...field} value={field.value ?? ''} disabled={isSaving} className="min-h" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <Card className="mt-4 border-dashed bg-muted/20">
                    <CardHeader className="pb-2 p-4 sm:p-6">
                        <CardTitle className="text-sm font-bold">Communication Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0 p-4 sm:p-6 sm:pt-0">
                        <FormField
                        control={form.control}
                        name="allowSms"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-blue-500" />
                                Receive SMS
                                </FormLabel>
                                <FormDescription className="text sm:text-xs">
                                    Allow sending bulk SMS messages.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isSaving}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="allowWhatsapp"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2 text-sm">
                                <MessageSquare className="h-4 w-4 text-green-500" />
                                Receive WhatsApp
                                </FormLabel>
                                <FormDescription className="text sm:text-xs">
                                    Allow sending bulk WhatsApp messages.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isSaving}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                    </CardContent>
                </Card>
            </form>
            </Form>
        </div>
        <DialogFooter className="p-4 sm:p-6 border-t mt-auto flex flex-col gap-2">
            <Button type="submit" form="customer-form" disabled={isSaving} className="w-full sm:w-auto h-11 font-bold">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Customer'}
            </Button>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving} className="w-full sm:w-auto h-11 font-bold">Cancel</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
