'use client';

import React, { useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  Store, 
  CreditCard, 
  Calendar,
  ShoppingBag,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';
import { useStoreUrl } from '@/hooks/use-store-url';
import { convertToDateSafely } from '@/lib/utils';
import { format } from 'date-fns';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  const firestore = useFirestore();
  const { user, isLoading: isAuthLoading } = useUser();
  const { settings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const currencySymbol = settings?.currency || '$';

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(getStoreUrl('/store/login'));
    }
  }, [isAuthLoading, user, router, getStoreUrl]);

  const orderRef = useMemo(() => 
    (firestore && orderId) ? doc(firestore, 'orders', orderId) : null,
    [firestore, orderId]
  );

  const { data: order, isLoading: isDocLoading, error } = useDoc<Order>(orderRef);

  const isLoading = isAuthLoading || isDocLoading;

  // Security check: ensure the order belongs to the logged-in user
  const isAuthorized = useMemo(() => {
    if (!order || !user) return true; 
    return order.user_id === user.uid;
  }, [order, user]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order || !isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The order you are looking for does not exist or you don't have permission to view it.
        </p>
        <Button onClick={() => router.push(getStoreUrl('/store/account'))}>
          Back to My Account
        </Button>
      </div>
    );
  }

  const orderDate = convertToDateSafely(order.createdAt);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
      case 'paid':
        return <Badge className="bg-green-600">{status.toUpperCase()}</Badge>;
      case 'cancelled':
      case 'failed':
        return <Badge variant="destructive">{status.toUpperCase()}</Badge>;
      case 'processing':
      case 'shipped':
        return <Badge className="bg-blue-500">{status.toUpperCase()}</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string | undefined, isPaid: boolean) => {
    const s = status || (isPaid ? 'PAID' : 'UNPAID');
    switch (s) {
      case 'PAID':
        return <Badge className="bg-green-600">PAID</Badge>;
      case 'UNPAID':
        return <Badge variant="destructive">UNPAID</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500">PENDING</Badge>;
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        className="mb-6 -ml-2 text-muted-foreground"
        onClick={() => router.push(getStoreUrl('/store/account'))}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Order Details</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Calendar className="mr-1.5 h-4 w-4" />
              {orderDate ? format(orderDate, 'PPP') : 'N/A'}
            </span>
            <span className="font-mono">ID: {orderId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(order.status)}
          {getPaymentStatusBadge(order.paymentStatus, order.isPaid)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5 text-primary" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="p-4 flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-bold text-sm sm:text-base">
                        {item.productName || `Product #${item.productId.slice(0, 5)}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.price, currencySymbol)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-black">
                        {formatCurrency(item.price * item.quantity, currencySymbol)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.totalAmount - (order.deliveryPrice || 0), currencySymbol)}</span>
                </div>
                {order.deliveryPrice !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{order.deliveryPrice === 0 ? 'Free' : formatCurrency(order.deliveryPrice, currencySymbol)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-baseline pt-2">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black text-primary">
                    {formatCurrency(order.totalAmount, currencySymbol)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CreditCard className="mr-2 h-5 w-5 text-primary" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Method</p>
                <p className="font-bold">{order.paymentMethod}</p>
              </div>
              {order.paymentReference && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Reference</p>
                  <p className="font-mono text-sm break-all">{order.paymentReference}</p>
                </div>
              )}
              {order.selectedBankAccount && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-bold mb-1">Bank Transfer Details:</p>
                  <p>{order.selectedBankAccount.bankName}</p>
                  <p className="font-mono">{order.selectedBankAccount.accountNumber}</p>
                  <p>{order.selectedBankAccount.accountName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                {order.fulfillmentType === 'pickup' ? (
                  <Store className="mr-2 h-5 w-5 text-primary" />
                ) : (
                  <Truck className="mr-2 h-5 w-5 text-primary" />
                )}
                Fulfillment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Type</p>
                <p className="font-bold capitalize">{order.fulfillmentType || 'Delivery'}</p>
              </div>
              {order.guestInfo?.address && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Address</p>
                  <p className="text-sm leading-relaxed">{order.guestInfo.address}</p>
                </div>
              )}
              {order.guestInfo?.phone && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Contact Phone</p>
                  <p className="text-sm">{order.guestInfo.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
