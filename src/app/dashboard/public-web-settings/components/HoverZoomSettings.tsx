'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ZoomIn, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const hoverZoomSchema = z.object({
  enableHoverZoom: z.boolean().optional(),
});

type FormValues = z.infer<typeof hoverZoomSchema>;

interface HoverZoomSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultValues: FormValues = {
  enableHoverZoom: true,
};

export function HoverZoomSettings({ settingsData, isLoading, storeId }: HoverZoomSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(hoverZoomSchema),
    defaultValues: defaultValues
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableHoverZoom: settingsData.enableHoverZoom ?? true,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Hover zoom settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultValues);
    toast({ title: 'Settings Reset', description: 'Hover zoom settings have been reset to default. Click "Save Settings" to apply.' });
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZoomIn className="h-5 w-5" /> Hover Zoom UI
            </CardTitle>
            <CardDescription>
              Toggle the image zoom effect when hovering over products in the public store and store app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="enableHoverZoom"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Hover Zoom Effect</FormLabel>
                    <FormDescription>
                      When enabled, product images will slightly zoom in when hovered.
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
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button type="submit" disabled={isSaving} className="px-8 font-bold">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Settings
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
