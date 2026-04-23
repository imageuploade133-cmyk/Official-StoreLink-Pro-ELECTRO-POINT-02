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
      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-yellow-50/50 to-white dark:from-yellow-950/20 dark:to-background border-l-4 border-yellow-500 border-t border-r border-b border-yellow-200 dark:border-t-yellow-800 dark:border-r-yellow-800 dark:border-b-yellow-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <AlertTriangle className="h-12 w-12 text-yellow-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-500">Low Stock</CardTitle>
          <div className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <Skeleton className="h-8 w-1/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight">{stats.lowStockCount}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Items nearing depletion</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-4 text-yellow-700 dark:text-yellow-400 hover:underline" asChild>
            <Link href="/dashboard/stock-alerts">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/20 dark:to-background border-l-4 border-red-500 border-t border-r border-b border-red-200 dark:border-t-red-800 dark:border-r-red-800 dark:border-b-red-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <PackageX className="h-12 w-12 text-red-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-500">Out of Stock</CardTitle>
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 shadow-sm">
            <PackageX className="h-4 w-4 text-red-600 dark:text-red-500" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <Skeleton className="h-8 w-1/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight">{stats.outOfStockCount}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Items with 0 stock</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-4 text-red-700 dark:text-red-400 hover:underline" asChild>
            <Link href="/dashboard/inventory">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-background border-l-4 border-orange-500 border-t border-r border-b border-orange-200 dark:border-t-orange-800 dark:border-r-orange-800 dark:border-b-orange-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <CalendarX className="h-12 w-12 text-orange-600" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-500">Expired Products</CardTitle>
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/50 shadow-sm">
            <CalendarX className="h-4 w-4 text-orange-600 dark:text-orange-500" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <Skeleton className="h-8 w-1/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight">{stats.expiredProductCount}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">Past expiry date</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-4 text-orange-700 dark:text-orange-400 hover:underline" asChild>
            <Link href="/dashboard/inventory">Review <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
