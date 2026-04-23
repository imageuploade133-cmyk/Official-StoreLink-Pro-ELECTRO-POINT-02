'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

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
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">Low Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-1/4 my-1" /> : <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.lowStockCount}</div>}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Items nearing depletion</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-3 text-yellow-600 dark:text-yellow-400 hover:underline" asChild>
            <Link href="/dashboard/stock-alerts">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">Out of Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-1/4 my-1" /> : <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.outOfStockCount}</div>}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Items with 0 stock</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-3 text-red-600 dark:text-red-400 hover:underline" asChild>
            <Link href="/dashboard/inventory">Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">Expired Products</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-1/4 my-1" /> : <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.expiredProductCount}</div>}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Past expiry date</p>
          <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-3 text-orange-600 dark:text-orange-400 hover:underline" asChild>
            <Link href="/dashboard/inventory">Review <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
