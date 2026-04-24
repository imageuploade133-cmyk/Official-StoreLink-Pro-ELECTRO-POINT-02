'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ProductVariantsManagerProps {
  storeId?: string;
}

export function ProductVariantsManager({ storeId }: ProductVariantsManagerProps) {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const hasVariants = watch('hasVariants');
  const variantOptions = watch('variantOptions') || [];

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: "variantOptions"
  });

  const { fields: variantFields, remove: removeVariant, replace: replaceVariants } = useFieldArray({
    control,
    name: "variants"
  });

  const variants = watch('variants') || [];

  const generateVariants = useCallback(() => {
    if (variantOptions.length === 0) {
      replaceVariants([]);
      return;
    }

    // Helper to generate combinations
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

    const newCombos = combinations(variantOptions);

    const newVariants = newCombos.map((combo) => {
      const name = Object.values(combo).join(' / ');
      const existing = variants.find((v: any) => v.name === name);
      
      if (existing) return existing;

      return {
        id: crypto.randomUUID(),
        name,
        options: combo,
        sku: '',
        sellingPrice: watch('sellingPrice'),
        stock: 0,
        imageUrl: '',
        isActive: true
      };
    });

    replaceVariants(newVariants);
  }, [variantOptions, replaceVariants, watch, variants]);

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

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 2MB." });
      return;
    }

    const variantId = variants[variantIndex].id;
    setIsUploading(variantId);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri, storeId });
        setValue(`variants.${variantIndex}.imageUrl`, result.display_url);
        toast({ title: "Image Uploaded", description: "Variant image updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploading(null);
      }
    };
  };

  return (
    <div className="space-y-6">
      <div className={cn(
        "p-6 rounded-2xl border transition-all duration-300",
        hasVariants 
          ? "bg-primary/5 border-primary/20 shadow-sm" 
          : "bg-muted/30 border-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl transition-colors",
              hasVariants ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <Label className="text-lg font-bold leading-none">Product Variants</Label>
              <p className="text-sm text-muted-foreground">Enable if the product has multiple versions (size, color, etc.)</p>
            </div>
          </div>
          <Switch 
            checked={hasVariants} 
            onCheckedChange={(checked) => setValue('hasVariants', checked)} 
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      {hasVariants && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
            <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Configure Options</h3>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 bg-background border-primary/20 text-primary hover:bg-primary/5 rounded-lg"
                onClick={() => appendOption({ name: '', values: [] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add Option
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {optionFields.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed border-muted-foreground/10">
                  <p className="text-sm text-muted-foreground">No options added. Add options like "Size" or "Color".</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {optionFields.map((field, index) => (
                    <div key={field.id} className="relative group grid grid-cols-1 md:grid-cols-12 gap-4 p-5 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      <div className="md:col-span-4 space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Option Name</Label>
                        <Input 
                          placeholder="e.g. Color, Size" 
                          className="bg-background"
                          {...control.register(`variantOptions.${index}.name` as const)}
                        />
                      </div>
                      
                      <div className="md:col-span-8 space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Option Values</Label>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 bg-background rounded-lg border border-input focus-within:ring-1 focus-within:ring-primary/20">
                            {variantOptions[index]?.values?.map((val: string, valIndex: number) => (
                              <Badge key={valIndex} variant="secondary" className="pl-3 pr-1 py-1 gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-none ring-1 ring-primary/20">
                                {val}
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveOptionValue(index, valIndex)}
                                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            {(!variantOptions[index]?.values || variantOptions[index].values.length === 0) && (
                              <span className="text-xs text-muted-foreground flex items-center h-6">No values added...</span>
                            )}
                          </div>
                          <div className="relative">
                            <Input 
                              placeholder="Type value (e.g. Red) and press Enter" 
                              className="pr-12"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddOptionValue(index, e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Badge variant="outline" className="text-[10px] opacity-50">ENTER</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {variantOptions.length > 0 && (
                <div className="pt-4 flex justify-end">
                  <Button 
                    type="button" 
                    className="gap-2 px-8 h-12 font-bold shadow-lg shadow-primary/20 rounded-xl"
                    onClick={generateVariants}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Generate Variants
                  </Button>
                </div>
              )}
            </div>
          </div>

          {variants.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-white font-bold">{variants.length}</Badge>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Generated Variants</h3>
                </div>
                <div className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Prices default to base price
                </div>
              </div>
              
              <div className="space-y-3">
                {variantFields.map((field, index) => {
                  const variant = variants[index] || field;
                  return (
                    <Card key={field.id} className={cn(
                      "overflow-hidden border-none ring-1 ring-border transition-all duration-300 hover:ring-primary/30 hover:shadow-md",
                      !variant.isActive && "opacity-60 grayscale bg-muted/30"
                    )}>
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row items-center">
                          <div className="w-full md:w-40 h-40 md:h-auto self-stretch bg-muted relative group overflow-hidden">
                            {variant.imageUrl ? (
                              <Image 
                                src={variant.imageUrl} 
                                alt={variant.name} 
                                fill 
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                                <ImageIcon className="h-8 w-8 opacity-20" />
                                <span className="text-[10px] font-bold uppercase">No Image</span>
                              </div>
                            )}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-2">
                              <Upload className="h-6 w-6" />
                              <span className="text-[10px] font-bold uppercase">Upload Photo</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(index, e)}
                                disabled={!!isUploading}
                              />
                            </label>
                            {isUploading === variant.id && (
                              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-[10px] font-black text-primary uppercase">Uploading...</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-black text-lg tracking-tight">{variant.name}</h4>
                                  {!variant.isActive && <Badge variant="outline" className="text-[10px] uppercase font-black text-muted-foreground">Disabled</Badge>}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(variant.options || {}).map(([key, val]: [string, any]) => (
                                    <Badge key={key} variant="outline" className="text-[10px] px-2 py-0 h-5 bg-muted/30 border-muted-foreground/20 font-medium">
                                      <span className="opacity-50 mr-1">{key}:</span> {val}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 rounded-xl border border-muted-foreground/10">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active</Label>
                                  <Switch 
                                    checked={variant.isActive} 
                                    onCheckedChange={(checked) => setValue(`variants.${index}.isActive`, checked)} 
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                  onClick={() => removeVariant(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">SKU Code</Label>
                                <Input 
                                  placeholder="STK-VOL-01" 
                                  className="h-9 text-xs font-mono bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                  {...control.register(`variants.${index}.sku` as const)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Barcode</Label>
                                <Input 
                                  placeholder="UPC / EAN" 
                                  className="h-9 text-xs font-mono bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                  {...control.register(`variants.${index}.barcode` as const)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Sale Price</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">$</span>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    placeholder="0.00" 
                                    className="h-9 text-xs pl-7 font-bold bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                    {...control.register(`variants.${index}.sellingPrice` as const)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Stock Level</Label>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  className="h-9 text-xs font-bold bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                  {...control.register(`variants.${index}.stock` as const)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
