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
      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-900/10 dark:to-background border-2 border-amber-500/20 hover:border-amber-500/40">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400">Low Stock</CardTitle>
          <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-900/40 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <Skeleton className="h-8 w-1/4 my-1" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-300">{stats.lowStockCount}</div>
          )}
          <p className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80 mt-1">Items nearing depletion</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-4 text-amber-700 dark:text-amber-400 hover:underline font-bold" asChild>
            <Link href="/dashboard/stock-alerts">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-900/10 dark:to-background border-2 border-rose-500/20 hover:border-rose-500/40">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <PackageX className="h-12 w-12 text-rose-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-rose-600 dark:text-rose-400">Out of Stock</CardTitle>
          <div className="p-2 rounded-xl bg-rose-500/10 dark:bg-rose-900/40 shadow-sm">
            <PackageX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <Skeleton className="h-8 w-1/4 my-1" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-rose-700 dark:text-rose-300">{stats.outOfStockCount}</div>
          )}
          <p className="text-xs font-medium text-rose-600/80 dark:text-rose-400/80 mt-1">Items with 0 stock</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-4 text-rose-700 dark:text-rose-400 hover:underline font-bold" asChild>
            <Link href="/dashboard/inventory">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-950/40 dark:via-orange-900/10 dark:to-background border-2 border-orange-500/20 hover:border-orange-500/40">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <CalendarX className="h-12 w-12 text-orange-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-orange-600 dark:text-orange-400">Expired Products</CardTitle>
          <div className="p-2 rounded-xl bg-orange-500/10 dark:bg-orange-900/40 shadow-sm">
            <CalendarX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading ? (
            <Skeleton className="h-8 w-1/4 my-1" />
          ) : (
            <div className="text-2xl font-black tracking-tight text-orange-700 dark:text-orange-300">{stats.expiredProductCount}</div>
          )}
          <p className="text-xs font-medium text-orange-600/80 dark:text-orange-400/80 mt-1">Past expiry date</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-4 text-orange-700 dark:text-orange-400 hover:underline font-bold" asChild>
            <Link href="/dashboard/inventory/expired">Review <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
