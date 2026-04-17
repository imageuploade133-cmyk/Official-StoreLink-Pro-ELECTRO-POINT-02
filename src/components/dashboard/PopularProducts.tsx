'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight } from "lucide-react";

interface PopularProductEntry {
  product: string;
  quantity: number;
  id: string;
}

interface PopularProductsProps {
  isLoading: boolean;
  popularProductsData: PopularProductEntry[];
}

export function PopularProducts({ isLoading, popularProductsData }: PopularProductsProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="font-headline">Popular Products</CardTitle>
        <CardDescription>Top 5 selling items (all time).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h flex flex-col justify-center space-y-3 px-2">
            <Skeleton className="h-8 w-full" /> <Skeleton className="h-8 w-full" /> <Skeleton className="h-8 w-full" /> <Skeleton className="h-8 w-4/5" /> <Skeleton className="h-8 w-3/5" />
          </div>
        ) : (
          <ScrollArea className="h">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Product</TableHead><TableHead className="text-right">Sales Qty</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {popularProductsData.length > 0 ? (
                  popularProductsData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium truncate max-w" title={item.product}>{item.product}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                  ))
                ) : (<TableRow><TableCell colSpan={2} className="h-24 text-center text-muted-foreground">No sales data available.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
      {popularProductsData.length > 0 && (
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/product-sales">View All Product Sales <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
