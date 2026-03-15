'use client';

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { BarcodeProduct } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface ProductListTableProps {
  products: BarcodeProduct[];
  onProductSelectionChange: (productId: string, isSelected: boolean) => void;
  onLabelQuantityChange: (productId: string, quantity: number) => void;
  onSelectAll: (checked: boolean) => void;
  areAllVisibleSelected: boolean;
  onBarcodeRegenerate: (productId: string) => void;
}

export function ProductListTable({
  products,
  onProductSelectionChange,
  onLabelQuantityChange,
  onSelectAll,
  areAllVisibleSelected,
  onBarcodeRegenerate,
}: ProductListTableProps) {
  
  if (products.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">No products found.</p>;
  }
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center py-2 px-3 border-b bg-slate-50 dark:bg-slate-800/50">
        <Checkbox
          id="select-all-products"
          checked={areAllVisibleSelected}
          onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
          aria-label="Select all products on this page"
          className="mr-3"
        />
        <label htmlFor="select-all-products" className="text-xs font-medium text-muted-foreground flex-grow cursor-pointer">
          Product Name / Barcode
        </label>
        <span className="text-xs font-medium text-muted-foreground w-20 text-center">Qty</span>
      </div>
      <ScrollArea className="h-[240px]"> 
        <div className="divide-y divide-border">
          {products.map((product) => (
            <div key={product.id} className="flex items-center py-2.5 px-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors" style={{ height: '48px' }}>
              <Checkbox
                id={`product-${product.id}`}
                checked={product.isSelected}
                onCheckedChange={(checked) => onProductSelectionChange(product.id, Boolean(checked))}
                className="mr-3 shrink-0"
                aria-labelledby={`product-name-${product.id}`}
              />
              <div className="flex-grow min-w-0 mr-2">
                <p id={`product-name-${product.id}`} className="text-sm font-medium text-foreground truncate" title={product.name}>
                  {product.name}
                </p>
                <div className="text-xs text-muted-foreground truncate font-mono flex items-center gap-1" title={product.barcode}>
                  <span>{product.barcode || 'No barcode'}</span>
                   {product.barcode && (
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-5 w-5 text-primary/70 hover:text-primary"><RotateCcw className="h-3 w-3" /></Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader><AlertDialogTitle>Regenerate Barcode?</AlertDialogTitle><AlertDialogDescription>This will create a new unique barcode for "{product.name}". The old barcode will no longer be valid.</AlertDialogDescription></AlertDialogHeader>
                         <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onBarcodeRegenerate(product.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   )}
                </div>
              </div>
              <Input
                type="number"
                min="0"
                value={product.labelQuantity}
                onChange={(e) => onLabelQuantityChange(product.id, parseInt(e.target.value, 10) || 0)}
                className="h-7 w-16 text-xs text-center shrink-0 mx-2"
                aria-label={`Quantity for ${product.name}`}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
