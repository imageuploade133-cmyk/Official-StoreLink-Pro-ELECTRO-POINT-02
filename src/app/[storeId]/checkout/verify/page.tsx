'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const storeId = params?.storeId as string;
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference') || searchParams.get('transaction_id');
      const provider = searchParams.get('provider');

      if (!reference || !provider) {
        setStatus('failed');
        setMessage('Missing transaction reference or provider.');
        return;
      }

      try {
        const res = await fetch(`/api/payment/verify?reference=${reference}&provider=${provider}&storeId=${storeId}`);
        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage('Payment successful! Your order is being processed.');
          toast({ title: 'Payment Successful', description: 'Your order has been confirmed.' });
        } else {
          setStatus('failed');
          setMessage(data.error || 'Payment verification failed.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage('An error occurred during verification.');
      }
    };

    verifyPayment();
  }, [searchParams, toast, storeId]);

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-xl font-medium">{message}</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <h1 className="text-3xl font-bold">Payment Confirmed!</h1>
        <p className="text-muted-foreground max-w-md">{message}</p>
        <Button asChild size="lg">
          <Link href={getStoreUrl("/store/account?tab=orders")}>View My Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      <XCircle className="h-20 w-20 text-destructive" />
      <h1 className="text-3xl font-bold">Payment Failed</h1>
      <p className="text-muted-foreground max-w-md">{message}</p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href={getStoreUrl("/store/checkout")}>Try Again</Link>
        </Button>
        <Button asChild>
          <Link href={getStoreUrl("/store/shop")}>Return to Shop</Link>
        </Button>
      </div>
    </div>
  );
}
