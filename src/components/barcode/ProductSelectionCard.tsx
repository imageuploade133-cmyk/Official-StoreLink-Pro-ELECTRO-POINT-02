
'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ProductListTable } from "./ProductListTable";
import { BarcodeListPagination } from "./BarcodeListPagination";
import type { BarcodeProduct } from "@/lib/types";

interface ProductSelectionCardProps {
  products: BarcodeProduct[];
  onProductSelectionChange: (productId: string, isSelected: boolean) => void;
  onLabelQuantityChange: (productId: string, quantity: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  allProductsCount: number;
  withBarcodesCount: number;
  totalFilteredCount: number;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectAllVisible: (checked: boolean) => void;
  areAllVisibleSelected: boolean;
  onBarcodeRegenerate: (productId: string) => void;
}

export function ProductSelectionCard({
  products,
  onProductSelectionChange,
  onLabelQuantityChange,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  allProductsCount,
  withBarcodesCount,
  totalFilteredCount,
  activeFilter,
  setActiveFilter,
  searchTerm,
  setSearchTerm,
  onSelectAllVisible,
  areAllVisibleSelected,
  onBarcodeRegenerate
}: ProductSelectionCardProps) {

  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  
  // Products are already pre-paginated from parent
  const currentDisplayProducts = products;

  return (
    <Card className="shadow-md rounded-lg flex flex-col">
      <CardHeader className="p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Button 
            variant={activeFilter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            className="flex-grow sm:flex-grow-0 h-9 text-xs font-bold"
            onClick={() => setActiveFilter('all')}
          >
            All Products ({allProductsCount})
          </Button>
          <Button 
            variant={activeFilter === 'withBarcodes' ? 'default' : 'outline'} 
            size="sm" 
            className="flex-grow sm:flex-grow-0 h-9 text-xs font-bold"
            onClick={() => setActiveFilter('withBarcodes')}
          >
            With Barcodes ({withBarcodesCount})
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search catalog by Name (Prefix)..."
            className="pl-8 h-9 text-xs"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ProductListTable 
          products={currentDisplayProducts}
          onProductSelectionChange={onProductSelectionChange}
          onLabelQuantityChange={onLabelQuantityChange}
          onSelectAll={onSelectAllVisible}
          areAllVisibleSelected={areAllVisibleSelected}
          onBarcodeRegenerate={onBarcodeRegenerate}
        />
      </CardContent>
      {totalPages > 1 && (
        <div className="p-3 border-t bg-muted/5">
          <BarcodeListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </Card>
  );
}
