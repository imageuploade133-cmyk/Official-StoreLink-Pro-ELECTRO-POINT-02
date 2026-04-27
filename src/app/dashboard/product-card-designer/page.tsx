'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Palette, Loader2, Code, Eye, Layout, Sparkles, Save, RotateCcw, Check, AlertCircle, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, Product, Category } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';

// Sample product for preview
const sampleProduct: Product = {
  id: 'preview-product',
  name: 'Premium Wireless Headphones with Noise Cancellation',
  sellingPrice: 299.99,
  purchasePrice: 150,
  stock: 15,
  categoryId: 'electronics',
  isVisibleInPOS: true,
  isVisibleOnWeb: true,
  isOfficialBrand: true,
  isNewArrival: true,
  isPopular: true,
  imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
  categoryName: 'Electronics',
  lowStockThreshold: 5,
  description: 'High-quality wireless headphones with active noise cancellation and 30-hour battery life.',
};

const sampleCategory: Category = {
  id: 'electronics',
  name: 'Electronics',
};

const cardStyles = [
  { id: 'default', name: 'Default', description: 'Standard product card with all features', icon: Layout },
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple design', icon: Sparkles },
  { id: 'classic', name: 'Classic', description: 'Traditional e-commerce look', icon: Monitor },
  { id: 'modern', name: 'Modern', description: 'Contemporary glassmorphism style', icon: Palette },
  { id: 'custom', name: 'Custom HTML', description: 'Design with your own HTML/CSS', icon: Code },
];

const borderRadiusOptions = [
  { value: 'none', label: 'None', class: 'rounded-none' },
  { value: 'sm', label: 'Small', class: 'rounded-sm' },
  { value: 'md', label: 'Medium', class: 'rounded-md' },
  { value: 'lg', label: 'Large', class: 'rounded-lg' },
  { value: 'xl', label: 'Extra Large', class: 'rounded-xl' },
  { value: 'full', label: 'Full', class: 'rounded-3xl' },
];

const shadowOptions = [
  { value: 'none', label: 'None', class: 'shadow-none' },
  { value: 'sm', label: 'Small', class: 'shadow-sm' },
  { value: 'md', label: 'Medium', class: 'shadow-md' },
  { value: 'lg', label: 'Large', class: 'shadow-lg' },
  { value: 'xl', label: 'Extra Large', class: 'shadow-xl' },
];

const borderWidthOptions = [
  { value: 'none', label: 'None', class: 'border-0' },
  { value: 'thin', label: 'Thin', class: 'border' },
  { value: 'medium', label: 'Medium', class: 'border-2' },
  { value: 'thick', label: 'Thick', class: 'border-4' },
];

const hoverEffectOptions = [
  { value: 'none', label: 'None' },
  { value: 'lift', label: 'Lift Up' },
  { value: 'zoom', label: 'Zoom Image' },
  { value: 'glow', label: 'Glow Effect' },
  { value: 'border', label: 'Border Highlight' },
];

const imageRatioOptions = [
  { value: 'square', label: 'Square (1:1)' },
  { value: 'portrait', label: 'Portrait (3:4)' },
  { value: 'landscape', label: 'Landscape (4:3)' },
];

export default function ProductCardDesignerPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [activeTab, setActiveTab] = useState('presets');

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

  // Fallback for old stores
  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;
  const isLoading = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true) || isAuthLoading;

  // Settings state
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    productCardStyle: 'default',
    productCardCustomHtml: '',
    productCardBorderRadius: 'lg',
    productCardShadow: 'md',
    productCardBorderWidth: 'thin',
    productCardBorderColor: '#e2e8f0',
    productCardBgColor: '#ffffff',
    productCardShowImage: true,
    productCardImageRatio: 'square',
    productCardShowBadges: true,
    productCardShowRating: true,
    productCardShowStockBar: true,
    productCardShowWishlist: true,
    productCardShowQuickAdd: true,
    productCardTitleLines: 2,
    productCardTitleAlign: 'left',
    productCardPriceAlign: 'left',
    productCardHoverEffect: 'lift',
    productCardHeight: 380,
  });

  // Load settings from Firestore
  useEffect(() => {
    if (settingsData) {
      setSettings({
        productCardStyle: settingsData.productCardStyle || 'default',
        productCardCustomHtml: settingsData.productCardCustomHtml || defaultHtmlTemplate,
        productCardBorderRadius: settingsData.productCardBorderRadius || 'lg',
        productCardShadow: settingsData.productCardShadow || 'md',
        productCardBorderWidth: settingsData.productCardBorderWidth || 'thin',
        productCardBorderColor: settingsData.productCardBorderColor || '#e2e8f0',
        productCardBgColor: settingsData.productCardBgColor || '#ffffff',
        productCardShowImage: settingsData.productCardShowImage !== false,
        productCardImageRatio: settingsData.productCardImageRatio || 'square',
        productCardShowBadges: settingsData.productCardShowBadges !== false,
        productCardShowRating: settingsData.productCardShowRating !== false,
        productCardShowStockBar: settingsData.productCardShowStockBar !== false,
        productCardShowWishlist: settingsData.productCardShowWishlist !== false,
        productCardShowQuickAdd: settingsData.productCardShowQuickAdd !== false,
        productCardTitleLines: settingsData.productCardTitleLines || 2,
        productCardTitleAlign: settingsData.productCardTitleAlign || 'left',
        productCardPriceAlign: settingsData.productCardPriceAlign || 'left',
        productCardHoverEffect: settingsData.productCardHoverEffect || 'lift',
        productCardHeight: settingsData.productCardHeight || 380,
      });
    }
  }, [settingsData]);

  // Reset status after 4 seconds
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSave = async () => {
    if (!firestore) {
      setSaveStatus('error');
      setErrorMessage('Firestore not available');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');
    
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, settings);
      } else {
        await saveGlobalSettings(firestore, settings);
      }

      setSaveStatus('success');
    } catch (error: any) {
      console.error('Error saving card designer settings:', error);
      setSaveStatus('error');
      setErrorMessage(error?.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = () => {
    setSettings({
      productCardStyle: 'default',
      productCardCustomHtml: defaultHtmlTemplate,
      productCardBorderRadius: 'lg',
      productCardShadow: 'md',
      productCardBorderWidth: 'thin',
      productCardBorderColor: '#e2e8f0',
      productCardBgColor: '#ffffff',
      productCardShowImage: true,
      productCardImageRatio: 'square',
      productCardShowBadges: true,
      productCardShowRating: true,
      productCardShowStockBar: true,
      productCardShowWishlist: true,
      productCardShowQuickAdd: true,
      productCardTitleLines: 2,
      productCardTitleAlign: 'left',
      productCardPriceAlign: 'left',
      productCardHoverEffect: 'lift',
      productCardHeight: 380,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const borderRadiusClass = borderRadiusOptions.find(o => o.value === settings.productCardBorderRadius)?.class || 'rounded-lg';
  const shadowClass = shadowOptions.find(o => o.value === settings.productCardShadow)?.class || 'shadow-md';
  const borderWidthClass = borderWidthOptions.find(o => o.value === settings.productCardBorderWidth)?.class || 'border';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Palette}
        title="Product Card Designer"
        description="Customize the appearance and style of product cards in your store."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 bg-muted/50 rounded-2xl border border-primary/5">
              <TabsTrigger 
                value="presets" 
                className="rounded-xl py-4 flex items-center gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Layout className="h-4 w-4" />
                Presets
              </TabsTrigger>
              <TabsTrigger 
                value="customize" 
                className="rounded-xl py-4 flex items-center gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Palette className="h-4 w-4" />
                Customize
              </TabsTrigger>
              <TabsTrigger 
                value="html" 
                className="rounded-xl py-4 flex items-center gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Code className="h-4 w-4" />
                Custom HTML
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4 focus-visible:outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle>Card Style Presets</CardTitle>
                    <CardDescription>
                      Choose from pre-designed card styles or create your own.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {cardStyles.map((style) => {
                        const Icon = style.icon;
                        const isSelected = settings.productCardStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            onClick={() => updateSetting('productCardStyle', style.id as any)}
                            className={cn(
                              'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'
                            )}
                          >
                            <div className={cn(
                              'p-3 rounded-lg',
                              isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{style.name}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{style.description}</p>
                            </div>
                            {isSelected && (
                              <Badge variant="default" className="bg-primary">Selected</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Customize Tab */}
              <TabsContent value="customize" className="space-y-4 focus-visible:outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Border Radius */}
                    <div className="space-y-3">
                      <Label>Border Radius</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {borderRadiusOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateSetting('productCardBorderRadius', option.value as any)}
                            className={cn(
                              'px-3 py-2 text-sm rounded-md border-2 transition-all',
                              settings.productCardBorderRadius === option.value
                                ? 'border-primary bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shadow */}
                    <div className="space-y-3">
                      <Label>Shadow</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {shadowOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateSetting('productCardShadow', option.value as any)}
                            className={cn(
                              'px-3 py-2 text-sm rounded-md border-2 transition-all',
                              settings.productCardShadow === option.value
                                ? 'border-primary bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Border */}
                    <div className="space-y-3">
                      <Label>Border Width</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {borderWidthOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateSetting('productCardBorderWidth', option.value as any)}
                            className={cn(
                              'px-3 py-2 text-sm rounded-md border-2 transition-all',
                              settings.productCardBorderWidth === option.value
                                ? 'border-primary bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-3">
                      <Label>Border Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={settings.productCardBorderColor}
                          onChange={(e) => updateSetting('productCardBorderColor', e.target.value)}
                          className="h-10 w-20 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.productCardBorderColor}
                          onChange={(e) => updateSetting('productCardBorderColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Background Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={settings.productCardBgColor}
                          onChange={(e) => updateSetting('productCardBgColor', e.target.value)}
                          className="h-10 w-20 rounded cursor-pointer"
                        />
                        <Input
                          value={settings.productCardBgColor}
                          onChange={(e) => updateSetting('productCardBgColor', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* Hover Effect */}
                    <div className="space-y-3">
                      <Label>Hover Effect</Label>
                      <Select
                        value={settings.productCardHoverEffect}
                        onValueChange={(value) => updateSetting('productCardHoverEffect', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hoverEffectOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Content & Layout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Image Settings */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Product Image</Label>
                        <p className="text-sm text-slate-500">Display the product image on the card</p>
                      </div>
                      <Switch
                        checked={settings.productCardShowImage}
                        onCheckedChange={(checked) => updateSetting('productCardShowImage', checked)}
                      />
                    </div>

                    {settings.productCardShowImage && (
                      <div className="space-y-3">
                        <Label>Image Aspect Ratio</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {imageRatioOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => updateSetting('productCardImageRatio', option.value as any)}
                              className={cn(
                                'px-3 py-2 text-sm rounded-md border-2 transition-all',
                                settings.productCardImageRatio === option.value
                                  ? 'border-primary bg-primary/10'
                                  : 'border-slate-200 dark:border-slate-700'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Toggle Elements */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Show Badges</Label>
                        <Switch
                          checked={settings.productCardShowBadges}
                          onCheckedChange={(checked) => updateSetting('productCardShowBadges', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Rating</Label>
                        <Switch
                          checked={settings.productCardShowRating}
                          onCheckedChange={(checked) => updateSetting('productCardShowRating', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Stock Bar</Label>
                        <Switch
                          checked={settings.productCardShowStockBar}
                          onCheckedChange={(checked) => updateSetting('productCardShowStockBar', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Wishlist Button</Label>
                        <Switch
                          checked={settings.productCardShowWishlist}
                          onCheckedChange={(checked) => updateSetting('productCardShowWishlist', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Quick Add Button</Label>
                        <Switch
                          checked={settings.productCardShowQuickAdd}
                          onCheckedChange={(checked) => updateSetting('productCardShowQuickAdd', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Title Settings */}
                    <div className="space-y-3">
                      <Label>Title Lines</Label>
                      <div className="flex items-center gap-4">
                        {[1, 2, 3].map((lines) => (
                          <button
                            key={lines}
                            onClick={() => updateSetting('productCardTitleLines', lines as any)}
                            className={cn(
                              'px-4 py-2 text-sm rounded-md border-2 transition-all',
                              settings.productCardTitleLines === lines
                                ? 'border-primary bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700'
                            )}
                          >
                            {lines} {lines === 1 ? 'Line' : 'Lines'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card Height */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Card Height</Label>
                        <span className="text-sm text-slate-500">{settings.productCardHeight}px</span>
                      </div>
                      <Slider
                        value={[settings.productCardHeight || 380]}
                        onValueChange={(value) => updateSetting('productCardHeight', value[0])}
                        min={200}
                        max={800}
                        step={10}
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>200px (Compact)</span>
                        <span>800px (Spacious)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom HTML Tab */}
              <TabsContent value="html" className="space-y-4 focus-visible:outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom HTML Template</CardTitle>
                    <CardDescription>
                      Create your own product card using HTML and Tailwind CSS classes.
                      Use placeholders like {'{{product.name}}'}, {'{{product.price}}'}, {'{{product.imageUrl}}'} etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>HTML Template</Label>
                      <Textarea
                        value={settings.productCardCustomHtml}
                        onChange={(e) => updateSetting('productCardCustomHtml', e.target.value)}
                        rows={25}
                        className="font-mono text-sm"
                        placeholder={defaultHtmlTemplate}
                      />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Available Placeholders:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <code>{'{{product.name}}'}</code>
                        <code>{'{{product.price}}'}</code>
                        <code>{'{{product.imageUrl}}'}</code>
                        <code>{'{{product.id}}'}</code>
                        <code>{'{{product.slug}}'}</code>
                        <code>{'{{product.category}}'}</code>
                        <code>{'{{product.stock}}'}</code>
                        <code>{'{{product.isNew}}'}</code>
                        <code>{'{{product.isPopular}}'}</code>
                        <code>{'{{product.isOfficial}}'}</code>
                        <code>{'{{currency}}'}</code>
                        <code>{'{{addToCart}}'}</code>
                        <code>{'{{wishlist}}'}</code>
                        <code>{'{{rating}}'}</code>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => updateSetting('productCardCustomHtml', defaultHtmlTemplate)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Default
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateSetting('productCardCustomHtml', minimalHtmlTemplate)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Minimal Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {saveStatus === 'success' && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Settings saved successfully!
                  </p>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {errorMessage || 'Failed to save settings. Please try again.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    'flex-[2]',
                    saveStatus === 'success' && 'bg-green-600 hover:bg-green-700',
                    saveStatus === 'error' && 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    See how your product cards will look in the store
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={cn(
                      'p-2 rounded-md transition-all',
                      previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={cn(
                      'p-2 rounded-md transition-all',
                      previewDevice === 'tablet' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
                    )}
                  >
                    <Tablet className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={cn(
                      'p-2 rounded-md transition-all',
                      previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'mx-auto transition-all duration-300 bg-slate-50 dark:bg-slate-900 rounded-lg p-6',
                previewDevice === 'mobile' && 'max-w-[375px]',
                previewDevice === 'tablet' && 'max-w-[768px]',
                previewDevice === 'desktop' && 'max-w-full'
              )}>
                {/* Preview Grid */}
                <div className={cn(
                  'grid gap-6',
                  previewDevice === 'mobile' && 'grid-cols-2',
                  previewDevice === 'tablet' && 'grid-cols-3',
                  previewDevice === 'desktop' && 'grid-cols-2'
                )}>
                  {/* Preview Card 1 */}
                  {settings.productCardStyle === 'custom' && settings.productCardCustomHtml ? (
                    <CustomHtmlCardPreview
                      html={settings.productCardCustomHtml}
                      product={sampleProduct}
                      category={sampleCategory}
                      currencySymbol="$"
                      settings={settings}
                    />
                  ) : (
                    <ProductCard 
                      product={sampleProduct}
                      category={sampleCategory}
                      currencySymbol="$"
                      overrideSettings={settings}
                    />
                  )}

                  {/* Preview Card 2 - Different Product */}
                  {settings.productCardStyle === 'custom' && settings.productCardCustomHtml ? (
                    <CustomHtmlCardPreview
                      html={settings.productCardCustomHtml}
                      product={{
                          ...sampleProduct,
                          id: 'preview-2',
                          name: 'Red Nike Sneakers - Limited Edition 2024',
                          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
                          sellingPrice: 189.99,
                          isOfficialBrand: false,
                          isNewArrival: true,
                          stock: 3
                      }}
                      category={{ id: 'footwear', name: 'Footwear' }}
                      currencySymbol="$"
                      settings={settings}
                    />
                  ) : (
                    <ProductCard 
                      product={{
                          ...sampleProduct,
                          id: 'preview-2',
                          name: 'Red Nike Sneakers - Limited Edition 2024',
                          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
                          sellingPrice: 189.99,
                          isOfficialBrand: false,
                          isNewArrival: true,
                          stock: 3
                      }}
                      category={{ id: 'footwear', name: 'Footwear' }}
                      currencySymbol="$"
                      overrideSettings={settings}
                    />
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-xs text-slate-500">
                Preview updates automatically as you make changes. Save to apply to your store.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Default HTML Template
const defaultHtmlTemplate = `<div class="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-500 hover:border-primary/30 overflow-hidden h-full hover:-translate-y-1" style="height: {{cardHeight}}px;">
  <!-- Media Area -->
  <a href="/store/product/{{product.slug}}" class="block relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900" style="height: 60%;">
    <img
      src="{{product.imageUrl}}"
      alt="{{product.name}}"
      class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
    />
    
    <!-- Badges -->
    <div class="absolute top-4 left-4 flex flex-col gap-2 z-10">
      {{#if product.isOfficial}}
      <span class="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 shadow-lg rounded-full">
        ✓ Official
      </span>
      {{/if}}
      {{#if product.discount}}
      <span class="bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 shadow-lg rounded-full">
        ⚡ -{{product.discount}}%
      </span>
      {{/if}}
    </div>

    <!-- Wishlist Button -->
    <button class="absolute top-4 right-4 h-11 w-11 flex items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg transition-all duration-300 hover:scale-110 z-10 border border-white/30">
      ♡
    </button>

    <!-- Quick Add -->
    <div class="absolute inset-x-0 bottom-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-gradient-to-t from-black/40 to-transparent">
      <button class="w-full bg-primary text-white font-black text-sm uppercase tracking-wide shadow-xl py-3 rounded-lg hover:shadow-2xl transition-all active:scale-95">
        🛒 Add to Bag
      </button>
    </div>
  </a>

  <!-- Content Area -->
  <div class="flex flex-col flex-1 p-5 space-y-4">
    <div class="flex-1 space-y-3">
      <p class="text-[10px] font-black uppercase tracking-widest text-primary/60 truncate">
        {{product.category}}
      </p>
      
      <h3 class="text-sm sm:text-base font-black text-slate-900 dark:text-white line-clamp-2 leading-snug tracking-tight">
        {{product.name}}
      </h3>

      <!-- Rating -->
      <div class="flex items-center gap-1">
        <span class="text-amber-400">★★★★☆</span>
        <span class="text-xs text-slate-500">({{product.reviewCount}})</span>
      </div>
      
      <!-- Tags -->
      <div class="flex flex-wrap gap-2">
        {{#if product.isNew}}
        <span class="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
          ✨ New
        </span>
        {{/if}}
        {{#if product.isPopular}}
        <span class="bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
          📈 Best
        </span>
        {{/if}}
      </div>
    </div>

    <!-- Price Section -->
    <div class="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      <!-- Stock Bar -->
      <div class="space-y-1">
        <div class="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full bg-green-500 rounded-full" style="width: {{product.stockPercentage}}%"></div>
        </div>
        <p class="text-[10px] font-medium text-slate-500">{{product.stockLabel}}</p>
      </div>

      <div class="flex items-end justify-between">
        <div class="flex flex-col">
          <span class="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {{currency}}{{product.price}}
          </span>
          {{#if product.originalPrice}}
          <span class="text-[10px] text-slate-400 line-through font-bold">
            {{currency}}{{product.originalPrice}}
          </span>
          {{/if}}
        </div>
        
        <!-- Mobile Cart -->
        <button class="md:hidden h-10 w-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg active:scale-90 transition-all">
          🛒
        </button>
      </div>
    </div>
  </div>
</div>`;

// Minimal HTML Template
const minimalHtmlTemplate = `<div class="group relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300" style="height: {{cardHeight}}px;">
  <a href="/store/product/{{product.slug}}" class="block">
    <div class="aspect-square overflow-hidden bg-slate-100">
      <img
        src="{{product.imageUrl}}"
        alt="{{product.name}}"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
    <div class="p-4 space-y-2">
      <p class="text-xs text-slate-500 uppercase tracking-wide">{{product.category}}</p>
      <h3 class="font-semibold text-slate-900 dark:text-white line-clamp-2">{{product.name}}</h3>
      <p class="text-lg font-bold text-slate-900 dark:text-white">{{currency}}{{product.price}}</p>
    </div>
  </a>
</div>`;

// Custom HTML Card Preview Component
function CustomHtmlCardPreview({
  html,
  product,
  category,
  currencySymbol,
  settings,
}: {
  html: string;
  product: Product;
  category: Category;
  currencySymbol: string;
  settings: Partial<AppSettings>;
}) {
  // Simple placeholder replacement
  const processedHtml = html
    .replace(/\{\{product\.name\}\}/g, product.name)
    .replace(/\{\{product\.price\}\}/g, product.sellingPrice.toString())
    .replace(/\{\{product\.imageUrl\}\}/g, product.imageUrl || '')
    .replace(/\{\{product\.id\}\}/g, product.id)
    .replace(/\{\{product\.slug\}\}/g, product.slug || product.id)
    .replace(/\{\{product\.category\}\}/g, category.name)
    .replace(/\{\{product\.stock\}\}/g, product.stock.toString())
    .replace(/\{\{product\.isNew\}\}/g, product.isNewArrival ? 'true' : 'false')
    .replace(/\{\{product\.isPopular\}\}/g, product.isPopular ? 'true' : 'false')
    .replace(/\{\{product\.isOfficial\}\}/g, product.isOfficialBrand ? 'true' : 'false')
    .replace(/\{\{currency\}\}/g, currencySymbol)
    .replace(/\{\{cardHeight\}\}/g, (settings.productCardHeight || 380).toString());

  return (
    <div
      className="custom-html-preview"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
