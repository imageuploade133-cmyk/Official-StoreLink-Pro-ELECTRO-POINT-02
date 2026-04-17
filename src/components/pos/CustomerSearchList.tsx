
'use client';

import React, { useMemo } from 'react';
import { 
  Users2, 
  Globe, 
  MonitorSmartphone, 
  Info,
  BadgeDollarSign,
  Search,
  PiggyBank,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatUtils';
import type { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

type RegistryFilterType = 'all' | 'pos' | 'online';

interface CustomerSearchListProps {
  customers: Customer[];
  isLoading: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  currencySymbol: string;
  registryFilter: RegistryFilterType;
  onRegistryFilterChange: (filter: RegistryFilterType) => void;
  page: number;
  isLastPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function CustomerSearchList({
  customers,
  isLoading,
  searchTerm,
  onSearchTermChange,
  onCustomerSelect,
  currencySymbol,
  registryFilter,
  onRegistryFilterChange,
  page,
  isLastPage,
  onNextPage,
  onPrevPage
}: CustomerSearchListProps) {

  // We filter results based on name locally for immediate feedback while using server pagination for broad exploration
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-7 lg:col-span-8 space-y-2">
            <Label className="text font-black uppercase text-muted-foreground tracking-widest ml-1">Identify Customer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Name, email, or phone..." 
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)} 
                className="pl-10 h-11 bg-background"
              />
            </div>
          </div>
          <div className="md:col-span-5 lg:col-span-4 space-y-2">
            <Label className="text font-black uppercase text-muted-foreground tracking-widest ml-1">Registry Filter</Label>
            <Tabs value={registryFilter} onValueChange={(v) => onRegistryFilterChange(v as RegistryFilterType)} className="w-full">
              <TabsList className="grid grid-cols-3 h-11 w-full">
                <TabsTrigger value="all" className="text-xs font-bold">All</TabsTrigger>
                <TabsTrigger value="pos" className="text-xs font-bold flex gap-1 items-center justify-center">
                  <MonitorSmartphone className="h-3 w-3 shrink-0" /> 
                  <span className="truncate">Terminal</span>
                </TabsTrigger>
                <TabsTrigger value="online" className="text-xs font-bold flex gap-1 items-center justify-center">
                  <Globe className="h-3 w-3 shrink-0" /> 
                  <span className="truncate">Web</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 mt-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filteredCustomers.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={cn(
                  "group w-full flex justify-between items-center p-3 sm:p-4 border-2 rounded-xl transition-all  text-left active:scale",
                  customer.status === 'active' 
                    ? "bg-card hover:border-primary/50 hover:bg-primary/5 border-transparent" 
                    : "opacity-50 cursor-not-allowed bg-muted border-transparent"
                )}
                onClick={() => onCustomerSelect(customer)}
                disabled={customer.status !== 'active'}
              >
                <div className="flex-grow min-w-0 mr-2 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate max-w sm:max-w-none">{customer.name}</p>
                    {customer.uid ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text h-4 sm:h-5 uppercase font-black px-1 sm:px-1.5">
                        <Globe className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 sm:mr-1" /> Web
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text h-4 sm:h-5 uppercase font-black px-1 sm:px-1.5">
                        <MonitorSmartphone className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 sm:mr-1" /> POS
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text sm:text-xs text-muted-foreground font-medium">
                    {customer.phone && <span className="flex items-center gap-1"><Info className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {customer.phone}</span>}
                    {customer.email && <span className="flex items-center gap-1 shrink-0"><Users2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {customer.email}</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                    <div className="text sm:text-xs font-semibold text-muted-foreground">
                      Spent: <span className="text-primary font-bold">{formatCurrency(customer.totalSpent, currencySymbol)}</span>
                    </div>
                    {customer.outstandingCredit > 0.01 && (
                      <div className="text sm:text-xs font-semibold text-destructive flex items-center gap-1">
                        <BadgeDollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {formatCurrency(customer.outstandingCredit, currencySymbol)}
                      </div>
                    )}
                    {customer.creditBalance > 0.01 && (
                      <div className="text sm:text-xs font-semibold text-green-600 flex items-center gap-1">
                        <PiggyBank className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {formatCurrency(customer.creditBalance, currencySymbol)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Users2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </button>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 sm:py-6 mt-4 border-t">
            <p className="text sm:text-xs font-bold text-muted-foreground uppercase tracking-widest order-2 sm:order-1">
                Page {page}
            </p>
            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onPrevPage} 
                    disabled={page === 1 || isLoading}
                    className="flex-1 sm:flex-none h-10 font-bold"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onNextPage} 
                    disabled={isLastPage || isLoading}
                    className="flex-1 sm:flex-none h-10 font-bold"
                >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users2 className="mx-auto h-16 w-16 mb-4 opacity-10" />
            <p className="font-bold text-lg">No customers found</p>
            <p className="text-sm">We couldn't find any customers matching these criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
