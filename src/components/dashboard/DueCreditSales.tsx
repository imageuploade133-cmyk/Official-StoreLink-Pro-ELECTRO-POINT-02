'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarClock, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/formatUtils";
import { convertToDateSafely } from "@/lib/utils";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import type { SaleTransaction } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';

interface DueCreditEntry extends SaleTransaction {
  amountActuallyDue: number;
  isOverdue: boolean;
}

interface DueCreditSalesProps {
  isLoading: boolean;
  dueCreditSales: DueCreditEntry[];
}

export function DueCreditSales({ isLoading, dueCreditSales }: DueCreditSalesProps) {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-card">
      <CardHeader className="border-b border-border/50 bg-muted/5">
        <CardTitle className="font-headline text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <span>Upcoming & Overdue</span>
        </CardTitle>
        <CardDescription>Top 5 unpaid credit sales needing attention.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="max-h-[300px] space-y-2">
            <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amt Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueCreditSales.length > 0 ? (
                  dueCreditSales.map((sale) => {
                    const safeDueDate = convertToDateSafely(sale.dueDate);
                    return (
                      <TableRow key={sale.id} className={cn(sale.isOverdue && "bg-red-50/70 dark:bg-red-900/20")}>
                        <TableCell className="font-medium text-sm">{sale.customerName || 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatCurrency(sale.amountActuallyDue, currencySymbol)}</TableCell>
                        <TableCell className="text-xs">{safeDueDate ? format(safeDueDate, 'PP') : 'N/A'}</TableCell>
                        <TableCell>{sale.isOverdue ? (<Badge variant="destructive">Overdue</Badge>) : (<Badge variant="outline">Upcoming</Badge>)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/sales-history?search=${sale.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No outstanding credit payments.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
