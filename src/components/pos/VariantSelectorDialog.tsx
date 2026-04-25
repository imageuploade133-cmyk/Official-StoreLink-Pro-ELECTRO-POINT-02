'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/formatUtils";
import type { DisplayProduct, ProductVariant } from "../../lib/types";
import Image from 'next/image';
import { useIsMobile } from "../../hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

  const ProductInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 py-4">
      <div className="relative aspect-square md:aspect-square w-full max-w-[200px] md:max-w-none mx-auto md:mx-0 rounded-xl overflow-hidden bg-muted">
        <Image
          src={selectedVariant?.imageUrl || product.imageUrl || 'https://placehold.co/400x400.png'}
          alt={product.name}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      
      <div className="space-y-4 flex flex-col justify-center">
        <div className="space-y-1">
          <p className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">Price</p>
          <p className="text-xl md:text-2xl font-black text-primary">
            {formatCurrency(selectedVariant?.sellingPrice || product.sellingPrice, currencySymbol)}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">Stock</p>
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
              <p className="text-xs md:text-sm text-muted-foreground uppercase font-bold tracking-wider">SKU</p>
              <p className="text-xs md:text-sm font-mono">{selectedVariant.sku}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const VariantOptions = () => (
    <ScrollArea className={cn("px-1", isMobile ? "max-h-[50vh]" : "max-h-[300px]")}>
      <div className="space-y-6 pb-4">
        {product.variantOptions?.map((option) => (
          <div key={option.name} className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {option.name}
            </label>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selectedOptions[option.name] === value;
                const isColor = option.name.toLowerCase().includes('color');
                const isSize = option.name.toLowerCase().includes('size');
                const useRound = isColor || isSize;
                
                if (useRound) {
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value }))}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all p-0.5 relative flex items-center justify-center",
                        isSelected ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                      )}
                      title={value}
                    >
                      <div 
                        className={cn(
                          "w-full h-full rounded-full border border-black/10 flex items-center justify-center overflow-hidden",
                          isSelected && !isColor && "bg-primary text-white"
                        )}
                        style={{ backgroundColor: isColor ? value.toLowerCase() : undefined }}
                      >
                         <span className={cn(
                           "text-[8px] font-black uppercase truncate px-0.5",
                           isColor ? "text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.4)]" : (isSelected ? "text-white" : "text-foreground")
                         )}>
                           {value}
                         </span>
                      </div>
                    </button>
                  );
                }
                
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: value }))}
                    className={cn(
                      "px-4 py-2 rounded-md border-2 text-sm font-bold transition-all",
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
  );

  const FooterActions = () => (
    <>
      <Button variant="outline" onClick={onClose} className="hidden md:flex">Cancel</Button>
      <Button 
        onClick={handleConfirm} 
        disabled={!selectedVariant || selectedVariant.stock <= 0}
        className="w-full md:w-auto font-bold uppercase h-12 md:h-10"
      >
        Add to Cart
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Select Options</DrawerTitle>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </DrawerHeader>
          <div className="px-4">
            <ProductInfo />
            <VariantOptions />
          </div>
          <DrawerFooter className="pt-2">
            <FooterActions />
            <Button variant="ghost" onClick={onClose} className="md:hidden">Close</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Options - {product.name}</DialogTitle>
        </DialogHeader>
        
        <ProductInfo />
        <VariantOptions />

        <DialogFooter>
          <FooterActions />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
