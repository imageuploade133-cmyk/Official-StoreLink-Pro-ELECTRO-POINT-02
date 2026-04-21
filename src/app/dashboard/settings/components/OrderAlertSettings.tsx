'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Mail, Plus, Trash2, AlertCircle, Send } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sendTestOrderEmailAction } from '@/app/actions/orders';

const orderAlertSettingsSchema = z.object({
  enableEmailAlerts: z.boolean().default(false),
  orderNotificationEmails: z.array(z.object({
    email: z.string().email({ message: "Please enter a valid email address." })
  })).min(0),
});

type FormValues = z.infer<typeof orderAlertSettingsSchema>;

interface OrderAlertSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function OrderAlertSettings({ settingsData, isLoading, storeId }: OrderAlertSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(orderAlertSettingsSchema),
    defaultValues: {
      enableEmailAlerts: false,
      orderNotificationEmails: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "orderNotificationEmails",
  });

  const enableEmailAlerts = form.watch('enableEmailAlerts');

  useEffect(() => {
    if (settingsData) {
      const emails = settingsData.orderNotificationEmails || [];
      form.reset({
        enableEmailAlerts: settingsData.enableEmailAlerts || false,
        orderNotificationEmails: emails.map(email => ({ email })),
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        enableEmailAlerts: values.enableEmailAlerts,
        orderNotificationEmails: values.orderNotificationEmails.map(item => item.email),
      };

      if (storeId) {
        await saveStoreSettings(firestore, storeId, dataToSave);
      } else {
        await saveGlobalSettings(firestore, dataToSave);
      }
      toast({ title: 'Success', description: 'Order alert settings have been updated.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    const emails = form.getValues('orderNotificationEmails')
        .map(item => item.email)
        .filter(email => email && z.string().email().safeParse(email).success);

    if (emails.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No valid emails',
            description: 'Please add and save at least one valid email address before sending a test.',
        });
        return;
    }

    setIsSendingTest(true);
    try {
        const result = await sendTestOrderEmailAction(emails, storeId || 'global', settingsData?.currency || '$');
        if (result.success) {
            toast({
                title: 'Test Email Sent',
                description: `A test order notification has been sent to ${emails.length} recipient(s).`,
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Test Failed',
            description: error.message || 'Failed to send test email.',
        });
    } finally {
        setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card className="border-primary/20 shadow-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary"/> Order Alerts (Email Notifications)
                    </CardTitle>
                    <CardDescription>
                        Get notified via email whenever a new order is placed on your store.
                    </CardDescription>
                </div>
                <FormField
                    control={form.control}
                    name="enableEmailAlerts"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange} 
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {enableEmailAlerts ? (
              <div className="space-y-4">
                <div className="space-y-2">
                    <FormLabel>Notification Recipients</FormLabel>
                    <FormDescription>
                        Add the email addresses that should receive order notifications.
                    </FormDescription>
                </div>

                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <FormField
                            key={field.id}
                            control={form.control}
                            name={`orderNotificationEmails.${index}.email`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input {...field} placeholder="admin@example.com" />
                                        </FormControl>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ email: "" })}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Email Address
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isSendingTest || fields.length === 0}
                        onClick={handleSendTest}
                    >
                        {isSendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Send Test Email
                    </Button>
                </div>

                {fields.length === 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No recipients added</AlertTitle>
                        <AlertDescription>
                            Email alerts are enabled but no email addresses have been added yet. Notifications will not be sent.
                        </AlertDescription>
                    </Alert>
                )}
              </div>
            ) : (
                <div className="py-6 text-center bg-muted/30 rounded-lg border border-dashed">
                    <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Email alerts are currently disabled. Toggle the switch above to enable them.
                    </p>
                </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/50 border-t px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground max-w-[60%]">
                Make sure to save your changes after adding or removing email addresses.
            </p>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Order Alert Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
