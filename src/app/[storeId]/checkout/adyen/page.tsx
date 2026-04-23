'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { AdyenCheckout } from '@adyen/adyen-web';
import '@adyen/adyen-web/styles/adyen.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AdyenPaymentPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const storeId = params?.storeId as string;
  
  const sessionId = searchParams.get('sessionId');
  const sessionData = searchParams.get('sessionData');
  const reference = searchParams.get('reference');
  const orderId = searchParams.get('orderId');

  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initCheckout() {
      if (!sessionId || !sessionData || !containerRef.current) return;

      try {
        // Fetch Adyen configuration from backend
        const res = await fetch(`/api/payment/methods?storeId=${storeId}`);
        const methods = await res.json();
        const adyenMethod = methods.find((m: any) => m.provider === 'adyen');
        
        if (!adyenMethod || !adyenMethod.publicKey) {
          throw new Error('Adyen client key not found');
        }

        const checkout: any = await AdyenCheckout({
          environment: adyenMethod.mode === 'live' ? 'live' : 'test',
          clientKey: adyenMethod.publicKey,
          session: {
            id: sessionId,
            sessionData: sessionData,
          },
          onPaymentCompleted: (result: any, component: any) => {
            console.info('Payment completed', result);
            router.push(`/${storeId}/checkout/verify?provider=adyen&reference=${reference}&resultCode=${result.resultCode}`);
          },
          onError: (error: any, component: any) => {
            console.error('Adyen Error', error);
            setError(error.message || 'An error occurred during payment');
          },
        });

        checkout.create('dropin').mount(containerRef.current);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to initialize Adyen Checkout', err);
        setError(err.message || 'Failed to initialize payment');
        setIsLoading(false);
      }
    }

    initCheckout();
  }, [sessionId, sessionData, storeId, reference, router]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Complete Your Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground font-medium">Initializing secure checkout...</p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-center">
              <p className="font-bold">Error</p>
              <p>{error}</p>
              <button 
                onClick={() => router.back()}
                className="mt-4 text-sm underline font-medium"
              >
                Go back and try again
              </button>
            </div>
          )}
          <div ref={containerRef} className={isLoading ? 'hidden' : 'block'} />
        </CardContent>
      </Card>
    </div>
  );
}
