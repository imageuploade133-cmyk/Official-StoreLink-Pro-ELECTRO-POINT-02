'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Order, PaymentStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely } from '@/lib/utils';
import { Loader2, ShoppingBag, Eye } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { useStoreUrl } from '@/hooks/use-store-url';

export function OrderHistoryTab({ user }: { user: any }) {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const currencySymbol = settings?.currency || '$';
  const [filter, setFilter] = useState<'ALL' | PaymentStatus>('ALL');

  const ordersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('user_id', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (filter === 'ALL') return orders;
    return orders.filter(order => (order.paymentStatus || 'UNPAID') === filter);
  }, [orders, filter]);

  const getPaymentStatusBadge = (status: string | undefined, isPaid: boolean) => {
    const s = status || (isPaid ? 'PAID' : 'UNPAID');
    
    switch (s) {
      case 'PAID':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent">PAID</Badge>;
      case 'UNPAID':
        return <Badge variant="destructive">UNPAID</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-transparent">PENDING</Badge>;
      case 'REFUNDED':
        return <Badge className="bg-gray-500 hover:bg-gray-600 text-white border-transparent">REFUNDED</Badge>;
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  if (isLoadingOrders) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Orders
          </CardTitle>
          <CardDescription>A list of all your past orders.</CardDescription>
        </div>
        
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="PAID">Paid</TabsTrigger>
            <TabsTrigger value="UNPAID">Unpaid</TabsTrigger>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders && filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const orderDate = convertToDateSafely(order.createdAt);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell>{orderDate ? format(orderDate, 'PP') : 'N/A'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.totalAmount, currencySymbol)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(order.paymentStatus, order.isPaid)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'completed' || order.status === 'delivered' ? 'default' : 'secondary'}>
                            {(order.status || 'Processing').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="sm" asChild>
                             <Link href={getStoreUrl(`/store/account/orders/${order.id}`)}>
                               <Eye className="mr-2 h-4 w-4"/>
                               View
                             </Link>
                           </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={6}>
                          <div className="text-center py-16">
                              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                              <h3 className="mt-4 text-lg font-semibold">No Orders Found</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {filter === 'ALL' 
                                  ? "When you place an order, it will appear here." 
                                  : `You don't have any ${filter.toLowerCase()} orders.`}
                              </p>
                              {filter === 'ALL' && (
                                <Button asChild size="sm" className="mt-6">
                                    <Link href={getStoreUrl("/store/shop")}>Start Shopping</Link>
                                </Button>
                              )}
                          </div>
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
