'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, BrandValue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Palette, Truck, ShieldCheck, Headset, Leaf, Sparkles, Gift, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const brandValueSchema = z.object({
  icon: z.string(),
  title: z.string().min(2, 'Title is required.'),
  description: z.string().min(2, 'Description is required.'),
});

const formSchema = z.object({
  brandValues: z.array(brandValueSchema).length(4, "There must be exactly 4 brand values."),
  brandValuesBackgroundColor: z.string().optional(),
  brandValuesVerticalPadding: z.number().min(0).optional(),
  brandValuesMaxWidth: z.number().min(0).optional(),
  showBrandValues: z.boolean().optional(),
  brandValuesEnableZoom: z.boolean().optional(),
  brandValuesEnableShadow: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const iconComponents = { Truck, ShieldCheck, Headset, Leaf, Sparkles, Gift };
const iconNames = Object.keys(iconComponents) as (keyof typeof iconComponents)[];

const DynamicIcon = ({ name }: { name: string }) => {
    const Icon = iconComponents[name as keyof typeof iconComponents];
    return Icon ? <Icon className="h-5 w-5" /> : null;
};

const defaultValuesArray: BrandValue[] = [
    { icon: 'Truck', title: 'Free Shipping', description: 'On all orders over $150' },
    { icon: 'ShieldCheck', title: 'Secure Payment', description: '100% secure payment' },
    { icon: 'Headset', title: '24/7 Support', description: 'Dedicated assistance' },
    { icon: 'Leaf', title: 'Eco-friendly', description: 'Sustainable packaging' },
];

interface BrandValuesSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultBrandValues: FormValues = {
  brandValues: [
    { icon: 'Truck', title: 'Free Shipping', description: 'On all orders over $150' },
    { icon: 'ShieldCheck', title: 'Secure Payment', description: '100% secure payment' },
    { icon: 'Headset', title: '24/7 Support', description: 'Dedicated assistance' },
    { icon: 'Leaf', title: 'Eco-friendly', description: 'Sustainable packaging' },
  ],
  brandValuesBackgroundColor: '#FFFFFF',
  brandValuesVerticalPadding: 80,
  brandValuesMaxWidth: 1400,
  showBrandValues: true,
  brandValuesEnableZoom: true,
  brandValuesEnableShadow: true,
};

export function BrandValuesSettings({ settingsData, isLoading, storeId }: BrandValuesSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultBrandValues
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'brandValues',
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        brandValues: settingsData.brandValues?.length === 4 ? settingsData.brandValues : defaultBrandValues.brandValues,
        brandValuesBackgroundColor: settingsData.brandValuesBackgroundColor || '#FFFFFF',
        brandValuesVerticalPadding: settingsData.brandValuesVerticalPadding ?? 80,
        brandValuesMaxWidth: settingsData.brandValuesMaxWidth ?? 1400,
        showBrandValues: settingsData.showBrandValues ?? true,
        brandValuesEnableZoom: settingsData.brandValuesEnableZoom ?? true,
        brandValuesEnableShadow: settingsData.brandValuesEnableShadow ?? true,
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
      toast({ title: 'Success', description: 'Brand values have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultBrandValues);
    toast({ title: 'Settings Reset', description: 'Brand values have been reset to default. Click "Save Brand Values" to save.' });
  };
  
  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Brand Values Section</CardTitle>
            <CardDescription>Customize the content and appearance of the brand values section on your public website.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="showBrandValues"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Show Section</FormLabel>
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
                name="brandValuesEnableZoom"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Zoom Hover</FormLabel>
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
                name="brandValuesEnableShadow"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Enable BG Shadow</FormLabel>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-muted/30">
                  <h4 className="font-semibold mb-3">Value #{index + 1}</h4>
                   <FormField
                    control={form.control}
                    name={`brandValues.${index}.icon`}
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <div className="flex items-center gap-2">
                                <DynamicIcon name={field.value} />
                                <SelectValue placeholder="Select an icon" />
                              </div>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {iconNames.map(name => (
                                <SelectItem key={name} value={name}>
                                    <div className="flex items-center gap-2">
                                        <DynamicIcon name={name} />
                                        <span>{name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`brandValues.${index}.title`}
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`brandValues.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                    control={form.control}
                    name="brandValuesBackgroundColor"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Background Color</FormLabel>
                            <div className="relative flex items-center">
                                <FormControl>
                                    <Input type="color" {...field} value={field.value || '#FFFFFF'} className="p-1 h-10 w-12 cursor-pointer" />
                                </FormControl>
                                <span className="absolute left-14 text-sm text-muted-foreground font-mono">{field.value}</span>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="brandValuesVerticalPadding"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Vertical Padding (px)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormDescription>Height: Space above and below cards.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="brandValuesMaxWidth"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Max Width (px)</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormDescription>Width: Maximum width of the section content.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Brand Values
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
