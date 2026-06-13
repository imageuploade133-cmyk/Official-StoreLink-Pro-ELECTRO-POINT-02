'use client';

import * as React from 'react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, PackageSearch } from 'lucide-react';
import type { AggregatedProductSale } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';

interface ProductSalesTableProps {
  products: AggregatedProductSale[];
  onViewDetails: (product: AggregatedProductSale) => void;
  currencySymbol: string;
}

export function ProductSalesTable({ products, onViewDetails, currencySymbol }: ProductSalesTableProps) {
    const { settings } = useSettings();
    const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
        <PackageSearch className="h-16 w-16 mb-4 text-gray-300" />
        <p className="font-medium">No Products Found</p>
        <p className="text-sm">Try adjusting your search term or date range.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Product Name</TableHead>
          <TableHead className="text-left">Qty Sold</TableHead>
          <TableHead className="text-left">Revenue</TableHead>
          <TableHead className="text-left">Profit</TableHead>
          <TableHead className="text-left">Stock Level</TableHead>
          <TableHead className="w-[100px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <Image
                src={product.imageUrl || defaultProductImageUrl}
                alt={product.name}
                width={40}
                height={40}
                className="rounded-md object-cover"
                data-ai-hint={product.dataAiHint || product.name.toLowerCase().split(' ').slice(0,2).join(' ')}
              />
            </TableCell>
            <TableCell>
              <p className="font-medium">{product.name}</p>
              {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
            </TableCell>
            <TableCell className="text-left font-medium">{product.totalQuantitySold}</TableCell>
            <TableCell className="text-left financial-value">{formatCurrency(product.totalRevenueGenerated, currencySymbol)}</TableCell>
            <TableCell className="text-left text-green-600 financial-value">{formatCurrency(product.totalProfit, currencySymbol)}</TableCell>
            <TableCell className="text-left">
              <Badge variant={product.currentStock <= 0 ? "destructive" : "secondary"}>
                {product.currentStock}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <Button variant="ghost" size="icon" onClick={() => onViewDetails(product)}>
                <Eye className="h-4 w-4" />
                <span className="sr-only">View Details</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
