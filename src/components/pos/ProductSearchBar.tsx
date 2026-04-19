'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Camera } from 'lucide-react';
import type { Category, DisplayProduct } from '@/lib/types';
import Image from 'next/image';
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { Button } from '@/components/ui/button';


interface ProductSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: Category[];
  loadingCategories: boolean;
  liveSearchResults: DisplayProduct[];
  isSearchDropdownOpen: boolean;
  searchInputContainerRef: React.RefObject<HTMLDivElement>;
  onSearchResultClick: (product: DisplayProduct) => void;
  onScan?: (barcode: string) => void;
  onOpenScanner?: () => void;
  currencySymbol: string;
  globalLowStockThreshold: number;
  today: Date | null;
}

export function ProductSearchBar({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  categories,
  loadingCategories,
  liveSearchResults,
  isSearchDropdownOpen,
  searchInputContainerRef,
  onSearchResultClick,
  onScan,
  onOpenScanner,
  currencySymbol,
  globalLowStockThreshold,
  today,
}: ProductSearchBarProps) {

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() && onScan) {
      onScan(searchTerm.trim());
    }
  };

  return (
    <Card className="mb-2 sm:mb-4 shadow-sm border-input">
      <CardHeader className="p-2 sm:p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-base">Find Products</CardTitle>
          {onOpenScanner && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenScanner}
              className="h-7 gap-1.5 text-[10px] sm:text-xs font-bold bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            >
              <Camera className="h-3.5 w-3.5" />
              Scan Barcode
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div ref={searchInputContainerRef} className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search by name, SKU or scan..."
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                data-barcode-input="true"
              />
              {isSearchDropdownOpen && liveSearchResults.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto shadow-xl border">
                  <CardContent className="p-0">
                    {liveSearchResults.map((product) => {
                      const effectivePrice = calculateEffectivePrice(product, today);
                      return (
                        <div
                          key={product.id}
                          className="flex items-center p-2.5 hover:bg-accent cursor-pointer gap-3 border-b last:border-b-0"
                          onClick={() => onSearchResultClick(product)}
                        >
                          <Image
                            src={product.imageUrl || 'https://placehold.co/40x40.png'}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded-md object-cover flex-shrink-0"
                            data-ai-hint={product.dataAiHint || product.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
                            unoptimized
                          />
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium truncate" title={product.name}>{product.name}</p>
                            <p className="text-xs text-primary font-semibold">{formatCurrency(effectivePrice, currencySymbol)}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {product.stock <= 0 ? (
                              <Badge variant="destructive" className="text-xs whitespace-nowrap">Out of Stock</Badge>
                            ) : product.stock <= (product.lowStockThreshold ?? globalLowStockThreshold) && product.stock > 0 ? (
                              <Badge variant="outline" className="text-xs whitespace-nowrap border-orange-500 text-orange-600">
                                Low: {product.stock}
                              </Badge>
                            ) : product.stock > (product.lowStockThreshold ?? globalLowStockThreshold) ? (
                              <Badge variant="default" className="text-xs whitespace-nowrap bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                                In Stock
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <div className="">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              disabled={loadingCategories || categories.length === 0}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
