'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  LayoutGrid, 
  Search, 
  Heart, 
  ShoppingCart, 
  User, 
  Moon, 
  Sun,
  CreditCard,
  Menu,
  MapPin,
  Maximize,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Grid3X3,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Sparkle,
  RotateCcw
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/auth-context';
import { useMemo } from 'react';

const navigationSchema = z.object({
  // Style Settings
  navbarStyle: z.enum(['standard', 'minimal', 'glass', 'solid', 'transparent']).optional(),
  navbarBackgroundColor: z.string().optional(),
  navbarTextColor: z.string().optional(),
  navbarBorderColor: z.string().optional(),
  navbarHeight: z.enum(['compact', 'default', 'expanded', 'full']).optional(),
  
  // Visibility Settings
  navbarShowSearch: z.boolean().optional(),
  navbarShowWishlist: z.boolean().optional(),
  navbarShowCart: z.boolean().optional(),
  navbarShowAccount: z.boolean().optional(),
  navbarShowThemeToggle: z.boolean().optional(),
  navbarShowCreditBadge: z.boolean().optional(),
  
  // Menu Settings
  navbarMenuStyle: z.enum(['dropdown', 'slide', 'none']).optional(),
  navbarShowShopLink: z.boolean().optional(),
  navbarShowFlashSalesLink: z.boolean().optional(),
  navbarShowCollectionsLink: z.boolean().optional(),
  
  // Layout Settings
  navbarLogoPosition: z.enum(['left', 'center', 'right']).optional(),
  navbarSticky: z.enum(['fixed', 'sticky', 'static']).optional(),
  navbarShadow: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
  navbarBlurEffect: z.boolean().optional(),
});

type FormValues = z.infer<typeof navigationSchema>;

const DEFAULT_NAV_SETTINGS: FormValues = {
  navbarStyle: 'standard',
  navbarBackgroundColor: '',
  navbarTextColor: '',
  navbarBorderColor: '',
  navbarHeight: 'default',
  navbarShowSearch: true,
  navbarShowWishlist: true,
  navbarShowCart: true,
  navbarShowAccount: true,
  navbarShowThemeToggle: true,
  navbarShowCreditBadge: true,
  navbarMenuStyle: 'dropdown',
  navbarShowShopLink: true,
  navbarShowFlashSalesLink: true,
  navbarShowCollectionsLink: true,
  navbarLogoPosition: 'left',
  navbarSticky: 'fixed',
  navbarShadow: 'none',
  navbarBlurEffect: true,
};

interface NavigationBarSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function NavigationBarSettings({ settingsData, isLoading }: NavigationBarSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const form = useForm<FormValues>({
    resolver: zodResolver(navigationSchema),
    defaultValues: DEFAULT_NAV_SETTINGS
  });

  const handleReset = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, DEFAULT_NAV_SETTINGS);
      } else {
        await saveGlobalSettings(firestore, DEFAULT_NAV_SETTINGS);
      }
      form.reset(DEFAULT_NAV_SETTINGS);
      toast({ 
        title: 'Settings Reset', 
        description: 'Navigation bar settings have been reset to default values.' 
      });
    } catch (e) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to reset settings.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (settingsData) {
      form.reset({
        navbarStyle: settingsData.navbarStyle || DEFAULT_NAV_SETTINGS.navbarStyle,
        navbarBackgroundColor: settingsData.navbarBackgroundColor || DEFAULT_NAV_SETTINGS.navbarBackgroundColor,
        navbarTextColor: settingsData.navbarTextColor || DEFAULT_NAV_SETTINGS.navbarTextColor,
        navbarBorderColor: settingsData.navbarBorderColor || DEFAULT_NAV_SETTINGS.navbarBorderColor,
        navbarHeight: settingsData.navbarHeight || DEFAULT_NAV_SETTINGS.navbarHeight,
        navbarShowSearch: settingsData.navbarShowSearch ?? DEFAULT_NAV_SETTINGS.navbarShowSearch,
        navbarShowWishlist: settingsData.navbarShowWishlist ?? DEFAULT_NAV_SETTINGS.navbarShowWishlist,
        navbarShowCart: settingsData.navbarShowCart ?? DEFAULT_NAV_SETTINGS.navbarShowCart,
        navbarShowAccount: settingsData.navbarShowAccount ?? DEFAULT_NAV_SETTINGS.navbarShowAccount,
        navbarShowThemeToggle: settingsData.navbarShowThemeToggle ?? DEFAULT_NAV_SETTINGS.navbarShowThemeToggle,
        navbarShowCreditBadge: settingsData.navbarShowCreditBadge ?? DEFAULT_NAV_SETTINGS.navbarShowCreditBadge,
        navbarMenuStyle: settingsData.navbarMenuStyle || DEFAULT_NAV_SETTINGS.navbarMenuStyle,
        navbarShowShopLink: settingsData.navbarShowShopLink ?? DEFAULT_NAV_SETTINGS.navbarShowShopLink,
        navbarShowFlashSalesLink: settingsData.navbarShowFlashSalesLink ?? DEFAULT_NAV_SETTINGS.navbarShowFlashSalesLink,
        navbarShowCollectionsLink: settingsData.navbarShowCollectionsLink ?? DEFAULT_NAV_SETTINGS.navbarShowCollectionsLink,
        navbarLogoPosition: settingsData.navbarLogoPosition || DEFAULT_NAV_SETTINGS.navbarLogoPosition,
        navbarSticky: settingsData.navbarSticky || DEFAULT_NAV_SETTINGS.navbarSticky,
        navbarShadow: settingsData.navbarShadow || DEFAULT_NAV_SETTINGS.navbarShadow,
        navbarBlurEffect: settingsData.navbarBlurEffect ?? DEFAULT_NAV_SETTINGS.navbarBlurEffect,
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
      toast({ title: 'Success', description: 'Navigation bar settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <Card className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Navigation Bar Appearance
            </CardTitle>
            <CardDescription>
              Customize how your public store header looks and behaves. Choose styles, colors, and which elements to display.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            <Tabs defaultValue="style" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="style">Style</TabsTrigger>
                <TabsTrigger value="visibility">Visibility</TabsTrigger>
                <TabsTrigger value="menu">Menu</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>
              
              {/* Style Tab */}
              <TabsContent value="style" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="navbarStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Navbar Style
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="glass">Glass Effect</SelectItem>
                            <SelectItem value="solid">Solid Color</SelectItem>
                            <SelectItem value="transparent">Transparent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the overall visual style of the navigation bar.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="navbarHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Maximize className="h-4 w-4" />
                          Navbar Height
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select height" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="compact">Compact (48px)</SelectItem>
                            <SelectItem value="default">Default (64px)</SelectItem>
                            <SelectItem value="expanded">Expanded (80px)</SelectItem>
                            <SelectItem value="full">Full (100%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Adjust the height of the navigation bar.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="navbarBackgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input type="color" {...field} className="h-10 w-14 p-1 cursor-pointer" />
                          </FormControl>
                          <Input {...field} placeholder="#ffffff" className="flex-1" />
                        </div>
                        <FormDescription>
                          Leave empty for default theme color.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="navbarTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input type="color" {...field} className="h-10 w-14 p-1 cursor-pointer" />
                          </FormControl>
                          <Input {...field} placeholder="#000000" className="flex-1" />
                        </div>
                        <FormDescription>
                          Leave empty for automatic contrast.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="navbarBorderColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Border Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input type="color" {...field} className="h-10 w-14 p-1 cursor-pointer" />
                          </FormControl>
                          <Input {...field} placeholder="transparent" className="flex-1" />
                        </div>
                        <FormDescription>
                          Set to transparent to remove border.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="navbarShadow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Shadow Strength
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shadow" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Shadow</SelectItem>
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="md">Medium</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                            <SelectItem value="xl">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="navbarBlurEffect"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Blur Effect
                          </FormLabel>
                          <FormDescription>
                            Enable frosted glass blur effect when scrolled.
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
                </div>
              </TabsContent>
              
              {/* Visibility Tab */}
              <TabsContent value="visibility" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="navbarShowSearch"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Search Bar
                          </FormLabel>
                          <FormDescription>
                            Show the search icon and search functionality.
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
                    name="navbarShowWishlist"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            Wishlist Button
                          </FormLabel>
                          <FormDescription>
                            Show the wishlist heart icon.
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
                    name="navbarShowCart"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Cart Button
                          </FormLabel>
                          <FormDescription>
                            Show the shopping cart icon.
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
                    name="navbarShowAccount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Account Button
                          </FormLabel>
                          <FormDescription>
                            Show user account/login button.
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
                    name="navbarShowThemeToggle"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Sun className="h-4 w-4" /> / <Moon className="h-4 w-4" />
                            Theme Toggle
                          </FormLabel>
                          <FormDescription>
                            Show light/dark mode toggle button.
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
                    name="navbarShowCreditBadge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Credit Badge
                          </FormLabel>
                          <FormDescription>
                            Show account credit balance badge.
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
                </div>
              </TabsContent>
              
              {/* Menu Tab */}
              <TabsContent value="menu" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="navbarMenuStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Menu className="h-4 w-4" />
                          Menu Style
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select menu style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="dropdown">Dropdown</SelectItem>
                            <SelectItem value="slide">Slide Panel</SelectItem>
                            <SelectItem value="none">No Menu</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose how the navigation menu is displayed.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="navbarShowShopLink"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Grid3X3 className="h-4 w-4" />
                            Shop Link
                          </FormLabel>
                          <FormDescription>
                            Show the "Shop" navigation link.
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
                    name="navbarShowFlashSalesLink"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Sparkle className="h-4 w-4" />
                            Flash Sales Link
                          </FormLabel>
                          <FormDescription>
                            Show the "Flash Sales" link.
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
                    name="navbarShowCollectionsLink"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Collections Link
                          </FormLabel>
                          <FormDescription>
                            Show the "Collections" dropdown link.
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
                </div>
              </TabsContent>
              
              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="navbarLogoPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Logo Position
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="left">
                              <div className="flex items-center gap-2">
                                <AlignLeft className="h-4 w-4" /> Left
                              </div>
                            </SelectItem>
                            <SelectItem value="center">
                              <div className="flex items-center gap-2">
                                <AlignCenter className="h-4 w-4" /> Center
                              </div>
                            </SelectItem>
                            <SelectItem value="right">
                              <div className="flex items-center gap-2">
                                <AlignRight className="h-4 w-4" /> Right
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Position of logo and store name in the header.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="navbarSticky"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Maximize className="h-4 w-4" />
                          Sticky Behavior
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select behavior" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed (Always at top)</SelectItem>
                            <SelectItem value="sticky">Sticky (Sticks on scroll)</SelectItem>
                            <SelectItem value="static">Static (Normal flow)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How the navbar behaves when scrolling.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t p-6 bg-muted/5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={isSaving}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all navigation bar settings to their factory defaults. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Reset Settings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" disabled={isSaving} className="px-8 font-bold">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}