'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatUtils";
import type { DisplayProduct, ProductVariant } from "@/lib/types";
import Image from 'next/image';

interface VariantSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: DisplayProduct;
  onConfirm: (variant: ProductVariant, selectedOptions: { [key: string]: string }) => void;
  currencySymbol: string;
}

export function VariantSelectorDialog({
  isOpen,
  onClose,
  product,
  onConfirm,
  currencySymbol
}: VariantSelectorDialogProps) {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  // Initialize selected options
  useEffect(() => {
    if (isOpen && product.variantOptions) {
      const initial: { [key: string]: string } = {};
      product.variantOptions.forEach(opt => {
        if (opt.values.length > 0) {
          initial[opt.name] = opt.values[0];
        }
      });
      setSelectedOptions(initial);
    }
  }, [isOpen, product]);

  const selectedVariant = useMemo(() => {
    if (!product.variants) return null;
    return product.variants.find(v => 
      v.isActive && 
      Object.entries(selectedOptions).every(([key, value]) => v.options[key] === value)
    );
  }, [product.variants, selectedOptions]);

  const handleConfirm = () => {
    if (selectedVariant) {
      onConfirm(selectedVariant, selectedOptions);
      onClose();
    }
  };

  if (!product.variantOptions || !product.variants) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Options - {product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
            <Image
              src={selectedVariant?.imageUrl || product.imageUrl || 'https://placehold.co/400x400.png'}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Price</p>
              <p className="text-2xl font-black text-primary">
                {formatCurrency(selectedVariant?.sellingPrice || product.sellingPrice, currencySymbol)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Stock Status</p>
              {selectedVariant ? (
                selectedVariant.stock > 0 ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                    {selectedVariant.stock} In Stock
                  </Badge>
                ) : (
                  <Badge variant="destructive">Out of Stock</Badge>
                )
              ) : (
                <Badge variant="outline">Invalid Combination</Badge>
              )}
            </div>

            {selectedVariant?.sku && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">SKU</p>
                <p className="text-sm font-mono">{selectedVariant.sku}</p>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[300px] px-1">
          <div className="space-y-6 pb-4">
            {product.variantOptions.map((option) => (
              <div key={option.name} className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {option.name}
                </label>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const isSelected = selectedOptions[option.name] === value;
                    const isColor = option.name.toLowerCase().includes('color');
                    
                    if (isColor) {
                      return (
                        <button
                          key={value}
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value }))}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all p-0.5",
                            isSelected ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                          )}
                          title={value}
                        >
                          <div 
                            className="w-full h-full rounded-full border border-black/10" 
                            style={{ backgroundColor: value.toLowerCase() }}
                          />
                        </button>
                      );
                    }
                    
                    return (
                      <button
                        key={value}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value }))}
                        className={cn(
                          "px-3 py-1.5 rounded-md border-2 text-xs font-bold transition-all",
                          isSelected 
                            ? "border-primary bg-primary text-white shadow-sm" 
                            : "border-muted bg-background text-foreground hover:border-primary/50"
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedVariant || selectedVariant.stock <= 0}
            className="font-bold uppercase"
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
