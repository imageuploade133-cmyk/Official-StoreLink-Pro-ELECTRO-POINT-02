'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { CheckCircle2, ShoppingBag, Loader2, Package, Truck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';
import { useStoreUrl } from '@/hooks/use-store-url';
import type { Order } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeId = params?.storeId as string;
  const orderId = searchParams.get('orderId');
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { getStoreUrl } = useStoreUrl();

  const orderRef = useMemo(() => 
    (firestore && orderId) ? doc(firestore, 'orders', orderId) : null,
    [firestore, orderId]
  );

  const { data: order, isLoading } = useDoc<Order>(orderRef);
  const currencySymbol = settings?.currency || '$';

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="max-w-3xl mx-auto py-16 px-4">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-green-100 dark:bg-green-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-lg">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tight">Order Confirmed!</h1>
          <p className="text-xl text-muted-foreground">
            Thank you for your purchase. {orderId ? `Your order #${orderId.slice(-6).toUpperCase()} has been received.` : "Your purchase has been placed successfully."}
          </p>
        </div>

        {order ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <Card className="overflow-hidden border-none shadow-xl ring-1 ring-border">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5 text-primary" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Status</span>
                    <span className="font-black uppercase text-primary tracking-wider px-3 py-1 bg-primary/10 rounded-full text-[10px]">
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Payment Method</span>
                    <span className="font-bold">{order.paymentMethod}</span>
                  </div>
                  {order.paymentReference && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Reference Code</span>
                      <span className="font-mono font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded">
                        {order.paymentReference}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Fulfillment</span>
                    <span className="font-bold flex items-center gap-2">
                      {order.fulfillmentType === 'pickup' ? (
                        <><Store className="h-4 w-4" /> Store Pickup</>
                      ) : (
                        <><Truck className="h-4 w-4" /> Delivery</>
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {order.deliveryPrice === 0 ? 'Free' : formatCurrency(order.deliveryPrice || 0, currencySymbol)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-lg font-bold">Total Amount</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">
                      {formatCurrency(order.totalAmount, currencySymbol)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.paymentMethod === 'Bank Transfer' && !order.isPaid && (
              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
                    <Package className="h-5 w-5" />
                    <span>Payment Pending Verification</span>
                  </div>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                    We will begin processing your order once your bank transfer has been verified. 
                    Please ensure you included the reference code in your transfer details.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="mb-8 border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
              <p className="text-muted-foreground italic">Order details are being processed. You can view them in your account dashboard shortly.</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <Button asChild size="lg" className="rounded-full px-10 h-14 font-bold shadow-lg shadow-primary/20">
            <Link href={getStoreUrl("/store/shop")}>Continue Shopping</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-10 h-14 font-bold">
            <Link href={getStoreUrl("/store/account")}>View My Orders</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
