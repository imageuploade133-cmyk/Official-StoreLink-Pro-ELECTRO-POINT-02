'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

interface FastCheckoutButtonsProps {
  storeId: string;
  amount: number;
  currency: string;
  availableMethods: any[];
  onSuccess: (orderId: string) => void;
  onBeforeCheckout?: () => Promise<string | null>;
  customerEmail?: string;
}

export function FastCheckoutButtons({ 
  storeId, 
  amount, 
  currency, 
  availableMethods,
  onSuccess,
  onBeforeCheckout,
  customerEmail 
}: FastCheckoutButtonsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [supportedMethods, setSupportedMethods] = useState<{applePay: boolean, googlePay: boolean, paymentApi: boolean}>({
    applePay: false,
    googlePay: false,
    paymentApi: false
  });
  const { toast } = useToast();

  useEffect(() => {
    // Check for browser support
    const checkSupport = async () => {
        const support = {
            applePay: (window as any).ApplePaySession !== undefined,
            googlePay: false, // Will check via PaymentRequest
            paymentApi: (window as any).PaymentRequest !== undefined
        };

        if (support.paymentApi) {
            try {
                const request = new PaymentRequest([{
                    supportedMethods: 'https://google.com/pay',
                    data: {
                        merchantId: '12345', // Dummy
                        apiVersion: 2,
                        apiVersionMinor: 0,
                        allowedPaymentMethods: [{
                            type: 'CARD',
                            parameters: {
                                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                                allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
                            },
                            tokenizationSpecification: {
                                type: 'PAYMENT_GATEWAY',
                                parameters: {
                                    gateway: 'example',
                                    gatewayMerchantId: 'exampleGatewayMerchantId'
                                }
                            }
                        }]
                    }
                }], {
                    total: { label: 'Total', amount: { currency: 'USD', value: '1.00' } }
                });
                
                support.googlePay = await request.canMakePayment();
            } catch (e) {
                console.log("GPay support check failed", e);
            }
        }
        
        setSupportedMethods(support);
    };

    checkSupport();
  }, []);

  const fastCheckoutConfig = availableMethods.find(m => m.id === 'fast_checkout')?.config;
  const isFastCheckoutEnabled = availableMethods.find(m => m.id === 'fast_checkout')?.isActive;

  if (!isFastCheckoutEnabled) return null;

  const stripeMethod = availableMethods.find(m => m.provider === 'stripe');
  const paypalMethod = availableMethods.find(m => m.provider === 'paypal');

  const showApplePay = fastCheckoutConfig?.enableApplePay && stripeMethod && supportedMethods.applePay;
  const showGooglePay = fastCheckoutConfig?.enableGooglePay && (stripeMethod || paypalMethod) && supportedMethods.googlePay;
  const showPayPalExpress = fastCheckoutConfig?.enableExpress && paypalMethod;

  if (!showApplePay && !showGooglePay && !showPayPalExpress) return null;

  const handleFastCheckout = async (provider: string) => {
    if (!customerEmail) {
        toast({ 
            variant: 'destructive', 
            title: 'Email Required', 
            description: 'Please enter your email address first for express checkout.' 
        });
        // Scroll to email field?
        const emailInput = document.getElementById('email');
        emailInput?.focus();
        emailInput?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    setIsProcessing(provider);
    try {
      let orderId = 'EXPRESS-' + Date.now();
      
      if (onBeforeCheckout) {
          const createdOrderId = await onBeforeCheckout();
          if (!createdOrderId) {
              setIsProcessing(null);
              return;
          }
          orderId = createdOrderId;
      }

      // In a real app, we might create a temporary order or use a specific express route
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          currency,
          email: customerEmail,
          providerName: provider,
          storeId,
          isExpress: true
        }),
      });

      const data = await res.json();
      if (data.success && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Failed to initialize express checkout');
      }
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Checkout Error', 
        description: error.message 
      });
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
        <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
        Express Checkout
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showApplePay && (
          <Button 
            variant="outline" 
            className="h-12 bg-black text-white hover:bg-black/90 border-none rounded-xl font-bold flex items-center justify-center gap-2"
            onClick={() => handleFastCheckout('stripe')}
            disabled={!!isProcessing}
          >
            {isProcessing === 'stripe' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M17.057 12.781c.014-2.671 2.214-3.951 2.314-4.013-1.252-1.83-3.197-2.08-3.887-2.108-1.644-.168-3.21 0-4.045.364-.863.376-1.621.905-2.072 1.545-.96 1.346-1.44 3.097-1.44 5.253 0 1.503.242 3.013.731 4.544.437 1.332 1.054 2.502 1.849 3.513.818 1.042 1.7 2.053 2.68 3.037.98-.984 1.862-1.995 2.68-3.037.795-1.011 1.412-2.181 1.849-3.513.489-1.531.731-3.041.731-4.544 0-.01-.004-.01-.004-.015zM15.467 5.748c.843-.843 1.428-2.013 1.428-3.248 0-.158-.014-.317-.04-.473-1.147.046-2.54.764-3.364 1.722-.736.853-1.385 2.022-1.385 3.257 0 .167.018.334.053.497 1.252-.097 2.518-.847 3.308-1.755z" />
                    </svg>
                    Pay
                </>
            )}
          </Button>
        )}

        {showGooglePay && (
          <Button 
            variant="outline" 
            className="h-12 bg-white text-black hover:bg-gray-50 border border-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
            onClick={() => handleFastCheckout(stripeMethod ? 'stripe' : 'paypal')}
            disabled={!!isProcessing}
          >
             {isProcessing === 'stripe' || isProcessing === 'paypal' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Pay
                </>
            )}
          </Button>
        )}

        {showPayPalExpress && (
          <Button 
            variant="outline" 
            className={cn("h-12 bg-[#ffc439] text-[#003087] hover:bg-[#ffc439]/90 border-none rounded-xl font-black italic text-lg flex items-center justify-center shadow-sm", (!showApplePay && !showGooglePay) ? "col-span-1" : "sm:col-span-2")}
            onClick={() => handleFastCheckout('paypal')}
            disabled={!!isProcessing}
          >
             {isProcessing === 'paypal' ? <Loader2 className="h-4 w-4 animate-spin text-[#003087]" /> : 'PayPal'}
          </Button>
        )}
      </div>
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-muted"></div>
        <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase">Or pay with details below</span>
        <div className="flex-grow border-t border-muted"></div>
      </div>
    </div>
  );
}
