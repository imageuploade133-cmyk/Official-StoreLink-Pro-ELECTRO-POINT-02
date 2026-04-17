'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PackageSearch, Truck } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface StockLevelTableProps {
  products: Product[];
  isLoading: boolean;
  onRestock: (product: Product) => void;
  title: string;
  description: string;
}

export function StockLevelTable({ products, isLoading, onRestock, title, description }: StockLevelTableProps) {
  const { settings } = useSettings();
  const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';
  const globalLowStockThreshold = settings?.lowStockThreshold ?? 10;
  
  if (isLoading) {
    // This part is tricky because the parent handles the main loading state.
    // We can show a simple loader or nothing.
    return <div className="py-16 text-center text-muted-foreground">Loading products...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <PackageSearch className="mx-auto h-12 w-12 mb-4 text-green-500" />
        <p className="font-semibold text-lg">All Good!</p>
        <p>{description}</p>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg">
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead className="w">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-center">Threshold</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {products.map(product => (
                  <TableRow key={product.id} className={product.stock <= 0 ? 'bg-red-50/50 dark:bg-red-900/20' : 'bg-orange-50/50 dark:bg-orange-900/20'}>
                      <TableCell>
                           <Image
                              src={product.imageUrl || defaultImageUrl}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover aspect-square"
                              data-ai-hint={product.dataAiHint || product.name.toLowerCase().split(' ').slice(0,2).join(' ')}
                          />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-center">
                        {product.stock <= 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                        ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-500">{product.stock}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{product.lowStockThreshold ?? globalLowStockThreshold}</TableCell>
                      <TableCell className="text-right">
                          <Button size="sm" onClick={() => onRestock(product)}>
                              <Truck className="mr-2 h-4 w-4"/>
                              Restock
                          </Button>
                      </TableCell>
                  </TableRow>
              ))}
          </TableBody>
      </Table>
    </div>
  );
}
