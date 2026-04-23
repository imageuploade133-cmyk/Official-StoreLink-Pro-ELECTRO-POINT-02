'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck } from "lucide-react";
import type { StockTransfer } from '@/lib/types';

interface RecentStockTransfer extends StockTransfer {
    transferDateDisplay: string;
}

interface RecentTransfersProps {
  isLoading: boolean;
  recentStockTransfers: RecentStockTransfer[];
}

export function RecentTransfers({ isLoading, recentStockTransfers }: RecentTransfersProps) {
  return (
    <Card className="shadow-sm overflow-hidden bg-white dark:bg-card">
      <CardHeader className="border-b border-border/50 bg-muted/5">
        <CardTitle className="font-headline text-lg flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <span>Stock Transfers</span>
        </CardTitle>
        <CardDescription>Latest 3 recorded stock movements.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="max-h-[300px] space-y-2">
            <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>From → To</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentStockTransfers.length > 0 ? (
                  recentStockTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium text-sm">{transfer.productName}</TableCell>
                      <TableCell className="text-right text-sm">{transfer.quantity}</TableCell>
                      <TableCell className="text-xs">{transfer.fromLocation} → {transfer.toLocation}</TableCell>
                      <TableCell className="text-xs">{transfer.transferDateDisplay}</TableCell>
                    </TableRow>
                  ))
                ) : (<TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No recent stock transfers.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
