'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  MousePointerClick, 
  Loader2, 
  Save, 
  ArrowRight,
  CheckCircle2,
  Palette,
  Sparkles,
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductReviewsSettings } from './components/ProductReviewsSettings';
import Link from 'next/link';

const shoppingExpSchema = z.object({
  showProductReviews: z.boolean().default(true),
  showReviewRatingOnCard: z.boolean().default(true),
  checkoutSuccessRedirectUrl: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof shoppingExpSchema>;

export default function ShoppingExperienceSettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (currentStoreId) {
            return doc(firestore, 'stores', currentStoreId, 'settings', 'config');
        }
        return doc(firestore, 'settings', 'global');
    },
    [firestore, currentStoreId]
  );

  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  const form = useForm<FormValues>({
    resolver: zodResolver(shoppingExpSchema),
    defaultValues: {
      showProductReviews: true,
      showReviewRatingOnCard: true,
      checkoutSuccessRedirectUrl: '',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        showProductReviews: settingsData.showProductReviews ?? true,
        showReviewRatingOnCard: settingsData.showReviewRatingOnCard ?? true,
        checkoutSuccessRedirectUrl: settingsData.checkoutSuccessRedirectUrl || '',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Your shopping experience settings have been saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={MousePointerClick} title="Shopping Experience" description="Loading..." />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={MousePointerClick}
        title="Shopping Experience Settings"
        description="Customize the checkout behavior and product review settings"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          
          {/* Link to Button Designer */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" /> Button UI/Style Designer
              </CardTitle>
              <CardDescription>
                Customize the appearance and behavior of shopping buttons throughout your store in our dedicated designer.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <Button asChild variant="default" className="gap-2">
                  <Link href="/dashboard/button-ui-style">
                    <Sparkles className="h-4 w-4" /> Go to Button Designer
                  </Link>
               </Button>
            </CardContent>
          </Card>

          {/* Checkout Success Redirect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Checkout Success Redirect
              </CardTitle>
              <CardDescription>
                Configure a custom URL to redirect customers to after a successful purchase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="checkoutSuccessRedirectUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" /> Redirect URL
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://yourwebsite.com/thank-you" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave empty to stay on the default order confirmation page.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Product Reviews Settings */}
          <ProductReviewsSettings />

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 min-w-[160px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
