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
  AlertCircle
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
  const variants = watch('variants') || [];

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: "variantOptions"
  });

  const generateVariants = useCallback(() => {
    if (variantOptions.length === 0) {
      setValue('variants', []);
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
    const existingVariants = variants;

    const newVariants = newCombos.map((combo) => {
      const name = Object.values(combo).join(' / ');
      const existing = existingVariants.find((v: any) => v.name === name);
      
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

    setValue('variants', newVariants);
  }, [variantOptions, setValue, watch, variants]);

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
      <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-base font-bold">This product has variants</Label>
          <p className="text-sm text-muted-foreground">Like different sizes or colors</p>
        </div>
        <Switch 
          checked={hasVariants} 
          onCheckedChange={(checked) => setValue('hasVariants', checked)} 
        />
      </div>

      {hasVariants && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Product Options</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => appendOption({ name: '', values: [] })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Option
                  </Button>
                </div>

                {optionFields.map((field, index) => (
                  <div key={field.id} className="space-y-4 p-4 border rounded-xl bg-muted/10 relative group">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <Label className="text-xs font-bold mb-2 block">Option Name</Label>
                        <Input 
                          placeholder="e.g. Color, Size" 
                          {...control.register(`variantOptions.${index}.name` as const)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs font-bold mb-2 block">Option Values</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {variantOptions[index]?.values?.map((val: string, valIndex: number) => (
                            <Badge key={valIndex} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                              {val}
                              <button 
                                type="button" 
                                onClick={() => handleRemoveOptionValue(index, valIndex)}
                                className="hover:bg-muted rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <Input 
                          placeholder="Type value and press enter" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionValue(index, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {variantOptions.length > 0 && (
                  <Button 
                    type="button" 
                    className="w-full mt-4" 
                    variant="secondary"
                    onClick={generateVariants}
                  >
                    Generate Variants Combinations
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {variants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider">Generated Variants ({variants.length})</h3>
              <div className="grid grid-cols-1 gap-4">
                {variants.map((variant: any, index: number) => (
                  <Card key={variant.id} className={cn("overflow-hidden border-2", !variant.isActive && "opacity-60 border-dashed")}>
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-32 h-32 bg-muted relative flex-shrink-0 group">
                          {variant.imageUrl ? (
                            <Image 
                              src={variant.imageUrl} 
                              alt={variant.name} 
                              fill 
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload className="h-6 w-6 text-white" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(index, e)}
                              disabled={!!isUploading}
                            />
                          </label>
                          {isUploading === variant.id && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-lg">{variant.name}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(variant.options).map(([key, val]: [string, any]) => (
                                  <Badge key={key} variant="outline" className="text-[10px]">
                                    {key}: {val}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Active</span>
                              <Switch 
                                checked={variant.isActive} 
                                onCheckedChange={(checked) => setValue(`variants.${index}.isActive`, checked)} 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase">SKU</Label>
                              <Input 
                                placeholder="Variant SKU" 
                                className="h-8 text-sm"
                                {...control.register(`variants.${index}.sku` as const)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase">Barcode</Label>
                              <Input 
                                placeholder="Variant Barcode" 
                                className="h-8 text-sm"
                                {...control.register(`variants.${index}.barcode` as const)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase">Price</Label>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="Price" 
                                className="h-8 text-sm"
                                {...control.register(`variants.${index}.sellingPrice` as const)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold uppercase">Stock Qty</Label>
                              <Input 
                                type="number" 
                                placeholder="Stock" 
                                className="h-8 text-sm"
                                {...control.register(`variants.${index}.stock` as const)}
                              />
                            </div>
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
    </div>
  );
}
