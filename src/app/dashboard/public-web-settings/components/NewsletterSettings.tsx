'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  showNewsletterSection: z.boolean().optional(),
  newsletterSectionTitle: z.string().optional(),
  newsletterSectionDescription: z.string().optional(),
  newsletterSectionBackgroundColor: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewsletterSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function NewsletterSettings({ settingsData, isLoading }: NewsletterSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const defaults = {
      showNewsletterSection: true,
      newsletterSectionTitle: 'Join Our Newsletter',
      newsletterSectionDescription: 'Subscribe to receive updates, access to exclusive deals, and more.',
      newsletterSectionBackgroundColor: '#f1f5f9', // Corresponds to primary/5 or a light gray
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (settingsData) {
        form.reset({
          showNewsletterSection: settingsData?.showNewsletterSection ?? defaults.showNewsletterSection,
          newsletterSectionTitle: settingsData?.newsletterSectionTitle || defaults.newsletterSectionTitle,
          newsletterSectionDescription: settingsData?.newsletterSectionDescription || defaults.newsletterSectionDescription,
          newsletterSectionBackgroundColor: settingsData?.newsletterSectionBackgroundColor || defaults.newsletterSectionBackgroundColor,
        });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Newsletter section settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Newsletter Section</CardTitle>
            <CardDescription>Control the newsletter subscription section on your homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="showNewsletterSection"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Newsletter Section</FormLabel>
                    <FormDescription>
                      Toggle the visibility of this section on your homepage.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newsletterSectionTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Join Our Newsletter" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newsletterSectionDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="e.g., Subscribe to receive updates..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="newsletterSectionBackgroundColor"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Section Background Color</FormLabel>
                        <div className="relative flex items-center">
                            <FormControl>
                                <Input type="color" {...field} value={field.value || '#f1f5f9'} className="p-1 h-10 w-12 cursor-pointer" />
                            </FormControl>
                            <span className="absolute left-14 text-sm text-muted-foreground font-mono">{field.value}</span>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Newsletter Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
