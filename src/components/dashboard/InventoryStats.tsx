'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, PackageX, CalendarX, ArrowRight } from "lucide-react";

interface InventoryStatsProps {
  isLoading: boolean;
  stats: {
    lowStockCount: number;
    outOfStockCount: number;
    expiredProductCount: number;
  };
}

export function InventoryStats({ isLoading, stats }: InventoryStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-500">Low Stock</CardTitle>
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-1/4 my-1" /> : <div className="text-2xl font-bold">{stats.lowStockCount}</div>}
          <p className="text-xs text-muted-foreground">Items nearing depletion</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-2 text-primary hover:underline" asChild>
            <Link href="/dashboard/stock-alerts">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-500">Out of Stock</CardTitle>
          <PackageX className="h-5 w-5 text-red-600 dark:text-red-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-1/4 my-1" /> : <div className="text-2xl font-bold">{stats.outOfStockCount}</div>}
          <p className="text-xs text-muted-foreground">Items with 0 stock</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-2 text-primary hover:underline" asChild>
            <Link href="/dashboard/inventory">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-500">Expired Products</CardTitle>
          <CalendarX className="h-5 w-5 text-orange-600 dark:text-orange-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-1/4 my-1" /> : <div className="text-2xl font-bold">{stats.expiredProductCount}</div>}
          <p className="text-xs text-muted-foreground">Past expiry date</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-2 text-primary hover:underline" asChild>
            <Link href="/dashboard/inventory">Review <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
