'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

  const ordersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('user_id', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  if (isLoadingOrders) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Your Orders
        </CardTitle>
        <CardDescription>A list of all your past orders.</CardDescription>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order) => {
                    const orderDate = convertToDateSafely(order.createdAt);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell>{orderDate ? format(orderDate, 'PP') : 'N/A'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.totalAmount, currencySymbol)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status || 'Processing'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="sm">
                             <Eye className="mr-2 h-4 w-4"/>
                             View
                           </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={5}>
                          <div className="text-center py-16">
                              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                              <h3 className="mt-4 text-lg font-semibold">No Orders Yet</h3>
                              <p className="mt-1 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
                              <Button asChild size="sm" className="mt-6">
                                  <Link href={getStoreUrl("/store/shop")}>Start Shopping</Link>
                              </Button>
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
