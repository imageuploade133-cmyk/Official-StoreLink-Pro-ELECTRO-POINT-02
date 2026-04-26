'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  X, 
  Upload, 
  Loader2, 
  Image as ImageIcon,
  Check,
  AlertCircle,
  SlidersHorizontal,
  ListPlus,
  CheckCircle2,
  Sparkles,
  Star,
  Palette,
  Type as TypeIcon,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { removeBackground } from '@/ai/flows/background-removal-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { compressAndResizeImage } from '@/lib/image-utils';
import { useSettings } from '@/contexts/settings-context';
import Image from 'next/image';
import { ConfirmationModal } from '../dialogs/ConfirmationModal';

const PRESET_OPTIONS = [
  { 
    name: 'Color', 
    placeholder: 'Enter values like Red, Blue, Black', 
    suggestions: [
      { name: 'Red', hex: '#FF0000' },
      { name: 'Black', hex: '#000000' },
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Blue', hex: '#0000FF' },
      { name: 'Green', hex: '#008000' },
      { name: 'Yellow', hex: '#FFFF00' },
      { name: 'Pink', hex: '#FFC0CB' },
      { name: 'Purple', hex: '#800080' },
      { name: 'Gray', hex: '#808080' },
      { name: 'Brown', hex: '#A52A2A' },
    ] 
  },
  { 
    name: 'Size', 
    placeholder: 'Enter values like S, M, L, XL', 
    suggestions: ['S', 'M', 'L', 'XL', 'XXL'] 
  },
  { 
    name: 'Material', 
    placeholder: 'Cotton, Leather, Wood', 
    suggestions: ['Cotton', 'Leather', 'Wood', 'Silk', 'Polyester', 'Denim', 'Linen', 'Wool'] 
  },
  { 
    name: 'Style', 
    placeholder: 'Modern, Classic, Minimalist', 
    suggestions: ['Modern', 'Classic', 'Minimalist', 'Vintage', 'Contemporary'] 
  },
  { 
    name: 'Storage', 
    placeholder: '64GB, 128GB, 256GB', 
    suggestions: ['64GB', '128GB', '256GB', '512GB', '1TB'] 
  },
  { 
    name: 'Length', 
    placeholder: 'Enter values like 10cm, 20cm, 30cm', 
    suggestions: ['10cm', '20cm', '30cm', '1m', '2m'] 
  },
  { 
    name: 'Weight', 
    placeholder: 'Enter values like 1kg, 2kg, 5kg', 
    suggestions: ['500g', '1kg', '2kg', '5kg', '10kg'] 
  },
  { 
    name: 'Flavor', 
    placeholder: 'Enter values like Vanilla, Chocolate, Strawberry', 
    suggestions: ['Vanilla', 'Chocolate', 'Strawberry', 'Mint', 'Mango', 'Orange', 'Lemon'] 
  },
  { 
    name: 'Pack Size', 
    placeholder: 'Pack of 2, Pack of 6, Pack of 12', 
    suggestions: ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 12', 'Pack of 24'] 
  },
  { 
    name: 'Model', 
    placeholder: '2023, 2024, Pro, Lite', 
    suggestions: ['2023', '2024', 'Pro', 'Lite', 'Max', 'Plus', 'Ultra'] 
  },
];

interface ProductVariantsManagerProps {
  storeId?: string;
}

export function ProductVariantsManager({ storeId }: ProductVariantsManagerProps) {
  const { control, watch, setValue, getValues, formState: { errors } } = useFormContext();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isProcessingAi, setIsProcessingAi] = useState<string | null>(null);
  const showAdvancedDetails = watch('advancedDetailsEnabled');
  const setShowAdvancedDetails = (val: boolean) => setValue('advancedDetailsEnabled', val, { shouldDirty: true });
  const [isManualMode, setIsManualMode] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const hasVariants = watch('hasVariants');
  const variantOptions = watch('variantOptions') || [];
  const variants = watch('variants') || [];
  const mainImageUrl = watch('imageUrl');

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: "variantOptions"
  });

  const handleToggleHasVariants = (checked: boolean) => {
    if (!checked) {
      if (variants.length > 0 || variantOptions.length > 0) {
        setConfirmConfig({
          isOpen: true,
          title: 'Disable Variants?',
          description: 'This will remove all configured options and variants. This action cannot be undone.',
          onConfirm: () => {
            setValue('hasVariants', false, { shouldDirty: true });
            setValue('variants', [], { shouldDirty: true });
            setValue('variantOptions', [], { shouldDirty: true });
            toast({ title: "Variants Disabled", description: "All variant data has been cleared." });
          }
        });
      } else {
        setValue('hasVariants', false, { shouldDirty: true });
      }
    } else {
      setValue('hasVariants', true, { shouldDirty: true });
    }
  };

  const generateVariants = useCallback(() => {
    if (isManualMode) return;

    const currentOptions = getValues('variantOptions') || [];
    const currentVariants = getValues('variants') || [];
    const baseSellingPrice = getValues('sellingPrice');
    const currentMainStock = getValues('stock') || 0;

    if (currentOptions.length === 0) {
      const manualVariants = currentVariants.filter((v: any) => v.isManual);
      if (JSON.stringify(manualVariants) !== JSON.stringify(currentVariants)) {
        setValue('variants', manualVariants);
      }
      return;
    }

    const validOptions = currentOptions.filter((opt: any) => opt.name && opt.values && opt.values.length > 0);
    if (validOptions.length === 0) {
      const manualVariants = currentVariants.filter((v: any) => v.isManual);
      if (JSON.stringify(manualVariants) !== JSON.stringify(currentVariants)) {
        setValue('variants', manualVariants);
      }
      return;
    }

    const combinations = (options: any[]): any[] => {
      if (options.length === 0) return [{}];
      const [first, ...rest] = options;
      const restCombinations = combinations(rest);
      const result: any[] = [];
      first.values.forEach((value: string) => {
        restCombinations.forEach((combo) => {
          result.push({ [first.name]: value, ...combo });
        });
      });
      return result;
    };

    const newCombos = combinations(validOptions);

    const generatedVariants = newCombos.map((combo) => {
      const name = Object.entries(combo)
        .map(([key, val]) => val)
        .join(' / ');
      
      const existing = currentVariants.find((v: any) => {
        if (v.isManual) return false;
        return Object.entries(combo).every(([key, val]) => v.options[key] === val) &&
               Object.keys(v.options).length === Object.keys(combo).length;
      });
      
      if (existing) return existing;

      return {
        id: crypto.randomUUID(),
        name,
        options: combo,
        sku: '',
        sellingPrice: baseSellingPrice,
        stock: 0,
        imageUrl: '',
        isActive: true,
        isManual: false
      };
    });

    const manualVariants = currentVariants.filter((v: any) => v.isManual);
    const newVariants = [...generatedVariants, ...manualVariants];

    /* 
    // Redistribution logic deactivated to allow "Standard" product stock to coexist with variants
    const totalOldStock = currentVariants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
    const totalNewStock = newVariants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
    
    const stockToDistribute = Math.max(totalOldStock, currentMainStock) - totalNewStock;

    if (stockToDistribute > 0 && newVariants.length > 0) {
      const targetIdx = newVariants.findIndex(v => v.isActive);
      const finalTargetIdx = targetIdx !== -1 ? targetIdx : 0;
      newVariants[finalTargetIdx] = {
        ...newVariants[finalTargetIdx],
        stock: (Number(newVariants[finalTargetIdx].stock) || 0) + stockToDistribute
      };
    }
    */

    if (JSON.stringify(newVariants) !== JSON.stringify(currentVariants)) {
      setValue('variants', newVariants);
    }
  }, [setValue, getValues, isManualMode]);

  const optionsString = JSON.stringify(variantOptions);
  useEffect(() => {
    if (hasVariants) {
      generateVariants();
    }
  }, [optionsString, hasVariants, generateVariants]);

  const handleAddOptionValue = (optionIndex: number, value: string) => {
    if (!value.trim()) return;
    const currentValues = variantOptions[optionIndex].values || [];
    if (currentValues.includes(value.trim())) return;
    
    const newValues = [...currentValues, value.trim()];
    setValue(`variantOptions.${optionIndex}.values`, newValues);
  };

  const handleRemoveOptionValue = (optionIndex: number, valueIndex: number) => {
    const currentValues = variantOptions[optionIndex].values || [];
    const newValues = currentValues.filter((_: any, i: number) => i !== valueIndex);
    setValue(`variantOptions.${optionIndex}.values`, newValues);
  };

  const handleImageUpload = async (variantIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxFileSizeMb = settings?.imageMaxFileSizeMb || 5;
    const maxSizeBytes = maxFileSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      toast({ 
        variant: "destructive", 
        title: "File too large", 
        description: `Image must be smaller than ${maxFileSizeMb}MB.` 
      });
      return;
    }

    const variantId = variants[variantIndex]?.id;
    if (!variantId) return;

    setIsUploading(variantId);

    try {
      const reader = new FileReader();
      const imageDataUri = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let optimizedDataUri = imageDataUri;
      try {
        optimizedDataUri = await compressAndResizeImage(
          imageDataUri, 
          settings?.imageUploadQuality || 80, 
          settings?.imageMaxWidth || 1920
        );
      } catch (optError) {
        console.error("Optimization failed:", optError);
      }

      const result = await uploadImage({ imageDataUri: optimizedDataUri, storeId });
      setValue(`variants.${variantIndex}.imageUrl`, result.display_url, { shouldDirty: true });
      toast({ title: "Image Uploaded", description: "Variant image updated." });
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
    } finally {
      setIsUploading(null);
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveBackground = async (variantIndex: number) => {
    const imageUrl = variants[variantIndex].imageUrl;
    if (!imageUrl) {
      toast({ variant: "destructive", title: "No Image", description: "Please upload an image first." });
      return;
    }

    const variantId = variants[variantIndex].id;
    setIsProcessingAi(variantId);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const imageDataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await removeBackground({ imageDataUri });
      const uploadResult = await uploadImage({ imageDataUri: result.display_url, storeId });

      setValue(`variants.${variantIndex}.imageUrl`, uploadResult.display_url);
      toast({ title: "Background Removed", description: "AI mockup generated successfully." });
    } catch (error: any) {
      console.error('Background removal failed:', error);
      toast({ variant: "destructive", title: "AI Processing Failed", description: error.message || "Could not remove background." });
    } finally {
      setIsProcessingAi(null);
    }
  };

  const handleUsePrimaryImage = (variantIndex: number) => {
    if (!mainImageUrl) {
      toast({ variant: "destructive", title: "No Primary Image", description: "Main product image is not set." });
      return;
    }
    setValue(`variants.${variantIndex}.imageUrl`, mainImageUrl);
    toast({ title: "Image Synced", description: "Using primary product image for this variant." });
  };

  const handleRemoveVariant = (index: number) => {
    const variantToRemove = variants[index];
    const removedStock = Number(variantToRemove.stock) || 0;
    const updatedVariants = variants.filter((_: any, i: number) => i !== index);
    
    if (updatedVariants.length > 0) {
      if (removedStock > 0) {
        const firstVariant = { ...updatedVariants[0] };
        firstVariant.stock = (Number(firstVariant.stock) || 0) + removedStock;
        updatedVariants[0] = firstVariant;
        setValue('variants', updatedVariants, { shouldDirty: true });
      } else {
        setValue('variants', updatedVariants, { shouldDirty: true });
      }
    } else {
      setValue('variants', [], { shouldDirty: true });
      setValue('hasVariants', false, { shouldDirty: true });
    }

    toast({ 
      title: "Variant Removed", 
      description: removedStock > 0 
        ? `Variant removed. ${removedStock} units returned to main stock.` 
        : "The variant has been removed from this product." 
    });
  };

  const handleRemoveVariantImage = (index: number) => {
    setValue(`variants.${index}.imageUrl`, '', { shouldDirty: true });
    toast({ 
      title: "Image Removed", 
      description: "Variant image has been cleared." 
    });
  };

  const handleAdditionalImageUpload = async (variantIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const variantId = variants[variantIndex]?.id;
    if (!variantId) return;

    setIsUploading(variantId);

    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const reader = new FileReader();
        const imageDataUri = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let optimizedDataUri = imageDataUri;
        try {
          optimizedDataUri = await compressAndResizeImage(
            imageDataUri, 
            settings?.imageUploadQuality || 80, 
            settings?.imageMaxWidth || 1920
          );
        } catch (optError) {
          console.error("Optimization failed:", optError);
        }

        const result = await uploadImage({ imageDataUri: optimizedDataUri, storeId });
        newUrls.push(result.display_url);
      }
      
      const currentUrls = getValues(`variants.${variantIndex}.additionalImageUrls`) || [];
      setValue(`variants.${variantIndex}.additionalImageUrls`, [...currentUrls, ...newUrls], { shouldDirty: true });
      toast({ title: "Images Uploaded", description: `Added ${newUrls.length} images to variant gallery.` });
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload images." });
    } finally {
      setIsUploading(null);
      if (event.target) event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card className={cn("border-none shadow-lg ring-1 ring-border transition-all", hasVariants && "ring-primary/20 bg-primary/5")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl transition-colors",
                hasVariants ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="text-lg font-bold leading-none">Product Variants</Label>
                  {hasVariants && (
                    <Badge variant="outline" className="text-[10px] uppercase font-black px-2 py-0 h-5 bg-primary/5 border-primary/20 text-primary">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Enable this if the product comes in different sizes, colors, etc.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {hasVariants && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-xl border border-dashed mr-2">
                  <Label htmlFor="manual-mode" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Manual Mode</Label>
                  <Switch 
                    id="manual-mode"
                    checked={isManualMode} 
                    onCheckedChange={setIsManualMode} 
                    className="scale-75 data-[state=checked]:bg-primary"
                  />
                </div>
              )}
              <Switch 
                checked={hasVariants} 
                onCheckedChange={handleToggleHasVariants} 
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasVariants && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="border-none shadow-md ring-1 ring-border overflow-hidden">
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Configure Options</h3>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 bg-background border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => {
                  if (optionFields.length < 3) {
                    appendOption({ name: '', values: [], optionType: 'preset', optionName: '' });
                  } else {
                    toast({
                      title: "Limit Reached",
                      description: "You can only add up to 3 variant options.",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={optionFields.length >= 3}
              >
                <Plus className="h-3.5 w-3.5" /> Add Option
              </Button>
            </div>
            <CardContent className="p-6 space-y-4">
              {optionFields.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed border-muted-foreground/10">
                  <p className="text-sm text-muted-foreground">No options added. Add options like "Size" or "Color".</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {optionFields.map((field, index) => {
                    const currentOption = variantOptions[index] || {};
                    const optionName = currentOption.name || '';
                    // Determine if it's a preset or custom based on current name if optionType is missing
                    const isPreset = PRESET_OPTIONS.some(p => p.name.toLowerCase() === optionName.toLowerCase());
                    const optionType = currentOption.optionType || (optionName ? (isPreset ? 'preset' : 'custom') : 'preset');
                    
                    const selectedPreset = PRESET_OPTIONS.find(p => p.name.toLowerCase() === optionName.toLowerCase());
                    const isColor = optionName.toLowerCase().includes('color');
                    const isSize = optionName.toLowerCase().includes('size');
                    const isMaterial = optionName.toLowerCase().includes('material');

                    return (
                      <div key={field.id} className="relative group p-6 rounded-3xl bg-background border shadow-sm hover:shadow-md transition-all">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Remove Option?',
                              description: `Removing the "${variantOptions[index]?.name || 'Option'}" will delete all associated variants. Are you sure?`,
                              onConfirm: () => {
                                removeOption(index);
                                if (optionFields.length === 1) {
                                  const currentVariants = getValues('variants') || [];
                                  const hasManualVariants = currentVariants.some((v: any) => v.isManual);
                                  if (!hasManualVariants) {
                                    setValue('hasVariants', false, { shouldDirty: true });
                                  }
                                }
                              }
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          <div className="md:col-span-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                {isColor ? <Palette className="h-4 w-4" /> : isSize ? <TypeIcon className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                              </div>
                              <div className="flex flex-col">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Option Name</Label>
                                {optionType === 'custom' && (
                                  <span className="text-[10px] text-primary font-bold uppercase">Custom Mode</span>
                                )}
                              </div>
                            </div>
                            
                            <Select 
                              value={optionType === 'custom' ? 'Custom' : optionName} 
                              onValueChange={(val) => {
                                if (val === 'Custom') {
                                  setValue(`variantOptions.${index}.optionType`, 'custom', { shouldDirty: true });
                                  setValue(`variantOptions.${index}.name`, '', { shouldDirty: true });
                                  setValue(`variantOptions.${index}.optionName`, '', { shouldDirty: true });
                                } else {
                                  setValue(`variantOptions.${index}.optionType`, 'preset', { shouldDirty: true });
                                  setValue(`variantOptions.${index}.name`, val, { shouldDirty: true });
                                  setValue(`variantOptions.${index}.optionName`, val, { shouldDirty: true });
                                }
                              }}
                            >
                              <SelectTrigger className="h-12 bg-muted/30 border-none focus:ring-2 focus:ring-primary/20 font-bold">
                                <SelectValue placeholder="Choose type..." />
                              </SelectTrigger>
                              <SelectContent>
                                {PRESET_OPTIONS.map((opt) => (
                                  <SelectItem 
                                    key={opt.name} 
                                    value={opt.name}
                                    disabled={variantOptions.some((o: any, i: number) => i !== index && o.name === opt.name)}
                                  >
                                    {opt.name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="Custom">Custom Option</SelectItem>
                              </SelectContent>
                            </Select>

                            {optionType === 'custom' && (
                              <div className="pt-1 animate-in fade-in slide-in-from-top-1">
                                <Input 
                                  placeholder="e.g. Fabric Type, RAM" 
                                  className="h-10 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                                  value={optionName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Check for duplicate names
                                    const isDuplicate = variantOptions.some((o: any, i: number) => i !== index && o.name?.toLowerCase() === val.toLowerCase());
                                    if (!isDuplicate) {
                                      setValue(`variantOptions.${index}.name`, val, { shouldDirty: true });
                                      setValue(`variantOptions.${index}.optionName`, val, { shouldDirty: true });
                                    } else {
                                      toast({
                                        title: "Duplicate Name",
                                        description: `An option named "${val}" already exists.`,
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                />
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <p className="text-[9px] text-muted-foreground px-1 font-medium">Examples: Fabric Type, RAM, Shoe Width, Occasion</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="md:col-span-8 space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Option Values</Label>
                            
                            <div className="flex flex-wrap gap-2 min-h-[3rem] p-3 bg-muted/30 rounded-2xl border border-transparent focus-within:border-primary/20 transition-all">
                              {variantOptions[index]?.values?.map((val: string, valIndex: number) => {
                                const colorSuggestion = isColor ? PRESET_OPTIONS[0].suggestions.find((c: any) => typeof c === 'object' && c.name.toLowerCase() === val.toLowerCase()) : null;
                                
                                return (
                                  <Badge 
                                    key={valIndex} 
                                    variant="secondary" 
                                    className="pl-3 pr-1 py-1.5 gap-2 bg-white dark:bg-slate-900 text-foreground hover:bg-white transition-colors border shadow-sm rounded-xl font-bold"
                                  >
                                    {isColor && (
                                      <div 
                                        className="w-3 h-3 rounded-full border border-black/10" 
                                        style={{ backgroundColor: (colorSuggestion as any)?.hex || val.toLowerCase() }} 
                                      />
                                    )}
                                    {val}
                                    <button 
                                      type="button" 
                                      onClick={() => handleRemoveOptionValue(index, valIndex)}
                                      className="text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                              
                              <div className="flex-1 flex items-center gap-2 group/input">
                                <Input 
                                  placeholder={selectedPreset?.placeholder || "Add value..."}
                                  className="flex-1 min-w-[120px] h-8 bg-transparent border-none focus-visible:ring-0 p-0 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOptionValue(index, e.currentTarget.value);
                                      e.currentTarget.value = '';
                                    }
                                  }}
                                  id={`option-input-${index}`}
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 px-2 text-[10px] font-bold gap-1 opacity-0 group-focus-within/input:opacity-100 transition-opacity bg-primary/10 text-primary hover:bg-primary/20"
                                  onClick={(e) => {
                                    const input = document.getElementById(`option-input-${index}`) as HTMLInputElement;
                                    if (input && input.value.trim()) {
                                      handleAddOptionValue(index, input.value);
                                      input.value = '';
                                      input.focus();
                                    }
                                  }}
                                >
                                  <Plus className="h-3 w-3" /> Add
                                </Button>
                              </div>
                            </div>

                            {selectedPreset && selectedPreset.suggestions.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 px-1">Suggested {optionName}:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedPreset.suggestions.map((s: any) => {
                                    const sName = typeof s === 'string' ? s : s.name;
                                    const sHex = typeof s === 'object' ? s.hex : null;
                                    
                                    return (
                                      <button
                                        key={sName}
                                        type="button"
                                        onClick={() => handleAddOptionValue(index, sName)}
                                        className="group flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all"
                                        title={sName}
                                      >
                                        {sHex && <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: sHex }} />}
                                        <span className="text-[10px] font-bold">{sName}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {variants.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">{isManualMode ? 'Custom' : 'Generated'} Variants</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{variants.length} unique items</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {variants.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-9 px-4 font-bold gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Clear All Variants?',
                          description: 'This will remove all generated and custom variants. This action cannot be undone.',
                          onConfirm: () => {
                            setValue('variants', [], { shouldDirty: true });
                            setValue('variantOptions', [], { shouldDirty: true });
                            setValue('hasVariants', false, { shouldDirty: true });
                            toast({ title: "Variants Cleared", description: "All variants have been removed." });
                          }
                        });
                      }}
                      disabled={!!isUploading || !!isProcessingAi}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Clear All</span>
                    </Button>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer" htmlFor="show-advanced">Advanced Details</Label>
                    <Switch id="show-advanced" checked={showAdvancedDetails} onCheckedChange={setShowAdvancedDetails} className="scale-75" />
                  </div>

                  {isManualMode && (
                    <Button
                      type="button"
                      onClick={() => {
                        const currentVariants = getValues('variants') || [];
                        const baseSellingPrice = getValues('sellingPrice');
                        const newVariant = {
                          id: crypto.randomUUID(),
                          name: 'New Variant',
                          options: {},
                          sku: '',
                          sellingPrice: baseSellingPrice,
                          stock: 0,
                          imageUrl: '',
                          isActive: true,
                          isManual: true
                        };
                        setValue('variants', [...currentVariants, newVariant], { shouldDirty: true });
                        toast({ title: "Variant Added", description: "You can now configure its details." });
                      }}
                      className="h-9 gap-2 bg-primary text-white hover:bg-primary/90 rounded-xl"
                    >
                      <Plus className="h-4 w-4" /> Add Variant
                    </Button>
                  )}

                  {!isManualMode && (
                    <div className="text-[10px] font-black uppercase text-primary/60 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                      <AlertCircle className="h-3 w-3" />
                      Prices synced
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {variants.map((variant: any, index: number) => (
                  <Card key={variant.id} className={cn(
                    "group overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl",
                    !variant.isActive && "opacity-60 grayscale bg-muted/30"
                  )}>
                    <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                      {variant.imageUrl ? (
                        <Image 
                          src={variant.imageUrl} 
                          alt={variant.name} 
                          fill 
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                          <ImageIcon className="h-10 w-10 opacity-10" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No Image</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <label className="flex">
                            <div className={cn(
                              "w-full h-9 gap-2 text-[10px] font-black uppercase bg-white text-black hover:bg-white/90 inline-flex items-center justify-center rounded-xl cursor-pointer transition-colors shadow-sm",
                              !!isUploading && "opacity-50 cursor-not-allowed"
                            )}>
                              <Upload className="h-3.5 w-3.5" /> Upload
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(index, e)}
                              disabled={!!isUploading}
                            />
                          </label>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-9 gap-2 text-[10px] font-black uppercase bg-primary text-white hover:bg-primary/90 rounded-xl shadow-sm"
                            onClick={() => handleUsePrimaryImage(index)}
                            disabled={!mainImageUrl}
                          >
                            <Star className="h-3.5 w-3.5" /> Primary
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-9 gap-2 text-[10px] font-black uppercase bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-md col-span-2"
                            onClick={() => handleRemoveBackground(index)}
                            disabled={!variant.imageUrl || !!isProcessingAi}
                          >
                            {isProcessingAi === variant.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI Mockup
                          </Button>

                          {variant.imageUrl && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-9 gap-2 text-[10px] font-black uppercase rounded-xl shadow-sm col-span-2"
                              onClick={() => {
                                setConfirmConfig({
                                  isOpen: true,
                                  title: 'Remove Image?',
                                  description: 'Are you sure you want to remove the image from this variant?',
                                  onConfirm: () => handleRemoveVariantImage(index)
                                });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove Image
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                        <Badge className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm",
                          variant.isActive ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {variant.isActive ? 'Active' : 'Hidden'}
                        </Badge>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full bg-destructive text-white hover:bg-destructive/90 transition-all shadow-sm"
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Delete Variant?',
                              description: `Are you sure you want to delete "${variant.name}"? This will return ${Number(variant.stock) || 0} units to main stock.`,
                              onConfirm: () => handleRemoveVariant(index)
                            });
                          }}
                          disabled={isUploading === variant.id || isProcessingAi === variant.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {(isUploading === variant.id || isProcessingAi === variant.id) && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {isUploading === variant.id ? 'Uploading...' : 'AI Processing...'}
                          </span>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-5 space-y-4">
                      <div className="space-y-1">
                        {isManualMode || showAdvancedDetails ? (
                          <Input 
                            className="font-black text-base truncate leading-tight border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                            {...control.register(`variants.${index}.name` as const)}
                          />
                        ) : (
                          <h4 className="font-black text-base truncate leading-tight" title={variant.name}>{variant.name}</h4>
                        )}
                        
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variant.options || {}).map(([key, val]: [string, any]) => (
                            <span key={key} className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                              {val}{' '}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">SKU Code</Label>
                          <Input 
                            placeholder="SKU..." 
                            className="h-10 text-xs font-mono bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl"
                            {...control.register(`variants.${index}.sku` as const)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Price</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">$</span>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="h-10 text-xs pl-7 font-black bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl"
                              {...control.register(`variants.${index}.sellingPrice` as const)}
                            />
                          </div>
                        </div>
                        
                        {showAdvancedDetails && (
                          <div className="col-span-2 space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                            <Separator className="bg-muted/50" />
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Color Attribute</Label>
                                <Input 
                                  placeholder="e.g. Red" 
                                  className="h-10 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl font-bold"
                                  {...control.register(`variants.${index}.options.Color` as const)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Size Attribute</Label>
                                <Input 
                                  placeholder="e.g. XL" 
                                  className="h-10 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl font-bold"
                                  {...control.register(`variants.${index}.options.Size` as const)}
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Internal Notes / Description</Label>
                                <textarea 
                                  placeholder="Extra details for this variant..." 
                                  className="w-full min-h-[60px] p-3 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl resize-none font-medium"
                                  {...control.register(`variants.${index}.description` as const)}
                                />
                              </div>
                              <div className="col-span-2 space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Additional Gallery Images</Label>
                                <div className="flex flex-wrap gap-2">
                                  {variant.additionalImageUrls?.map((url: string, imgIdx: number) => (
                                    <div key={imgIdx} className="relative w-12 h-12 rounded-xl overflow-hidden border bg-muted">
                                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                                      <button 
                                        type="button"
                                        className="absolute top-0 right-0 bg-destructive/80 text-white p-0.5 rounded-bl-lg hover:bg-destructive transition-colors"
                                        onClick={() => {
                                          setConfirmConfig({
                                            isOpen: true,
                                            title: 'Remove Image?',
                                            description: 'Are you sure you want to remove this image from the variant gallery?',
                                            onConfirm: () => {
                                              const current = getValues(`variants.${index}.additionalImageUrls`) || [];
                                              setValue(`variants.${index}.additionalImageUrls`, current.filter((_: any, i: number) => i !== imgIdx), { shouldDirty: true });
                                              toast({ title: "Image Removed", description: "Variant gallery updated." });
                                            }
                                          });
                                        }}
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <label className="w-12 h-12 flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all text-muted-foreground hover:text-primary">
                                    <Plus className="h-4 w-4" />
                                    <span className="text-[7px] font-black uppercase">Add</span>
                                    <input 
                                      type="file" 
                                      multiple 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleAdditionalImageUpload(index, e)} 
                                      disabled={isUploading === variant.id}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Stock</Label>
                          <Input 
                            type="number" 
                            readOnly
                            className="h-10 text-xs font-black bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl cursor-not-allowed opacity-70"
                            {...control.register(`variants.${index}.stock` as const)}
                          />
                          <p className="text-[8px] text-primary font-bold">Edit in 'Current Stock' above</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Status</Label>
                          <div className="flex items-center justify-between h-10 px-3 bg-muted/30 rounded-xl">
                            <span className="text-[10px] font-bold uppercase">{variant.isActive ? 'On' : 'Off'}</span>
                            <Switch 
                              checked={variant.isActive} 
                              onCheckedChange={(checked) => setValue(`variants.${index}.isActive`, checked)} 
                              className="scale-75 data-[state=checked]:bg-primary"
                              disabled={isUploading === variant.id || isProcessingAi === variant.id}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
      />
    </div>
  );
}
