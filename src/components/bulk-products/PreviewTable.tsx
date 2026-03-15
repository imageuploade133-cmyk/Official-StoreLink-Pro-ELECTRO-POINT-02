'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/formatUtils';
import type { Product } from '@/lib/types';
import { Button } from '../ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

type ParsedProduct = Omit<Product, 'id'> & { id?: string; action: 'create' | 'update' };

interface PreviewTableProps {
  parsedData: ParsedProduct[];
  currencySymbol: string;
  onImport: () => void;
  isProcessing: boolean;
}

export function PreviewTable({ parsedData, currencySymbol, onImport, isProcessing }: PreviewTableProps) {
  if (parsedData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Preview & Import</CardTitle>
        <CardDescription>
          Review the data parsed from your file. If everything looks correct, proceed with the import.
          Products will be updated if a matching SKU is found, otherwise a new product will be created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.sku || <span className='text-muted-foreground italic'>N/A</span>}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.sellingPrice, currencySymbol)}</TableCell>
                  <TableCell className="text-right">{row.stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <Button onClick={onImport} disabled={parsedData.length === 0 || isProcessing}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Processing...' : `Import ${parsedData.length} Products`}
        </Button>
      </CardFooter>
    </Card>
  );
}
