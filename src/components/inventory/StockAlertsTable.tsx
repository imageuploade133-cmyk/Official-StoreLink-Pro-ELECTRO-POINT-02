'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PackageSearch, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import Image from 'next/image';

interface StockAlertsTableProps {
  products: Product[];
  isLoading: boolean;
  onRestock: (product: Product) => void;
}

export function StockAlertsTable({ products, isLoading, onRestock }: StockAlertsTableProps) {
  const { settings } = useSettings();
  const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';
  const globalLowStockThreshold = settings?.lowStockThreshold ?? 10;
  
  return (
    <Card className="">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Stock Alerts
        </CardTitle>
        <CardDescription>
          Products that are low on stock or out of stock based on their set thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    {isLoading ? (
                         [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : products.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2">
                                    <PackageSearch className="h-12 w-12" />
                                    <p className="font-semibold">All products are well-stocked.</p>
                                    <p className="text-sm">No items are currently below their stock threshold.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        products.map(product => (
                            <TableRow key={product.id} className={product.stock <= 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}>
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
                                <TableCell className="text-center font-bold text-destructive">{product.stock}</TableCell>
                                <TableCell className="text-center">{product.lowStockThreshold ?? globalLowStockThreshold}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => onRestock(product)}>
                                        <Truck className="mr-2 h-4 w-4"/>
                                        Restock
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
