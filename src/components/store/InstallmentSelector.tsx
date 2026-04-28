'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, Timestamp, query, where, orderBy, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  Calculator,
  Check,
  ChevronRight,
  CreditCard,
  AlertCircle,
  Calendar,
  DollarSign,
  Loader2,
  Clock,
  Info,
  ArrowRight,
  Phone,
  Mail,
  User
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import type { InstallmentPlan, InstallmentPaymentSchedule, InstallmentOrder } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface InstallmentSelectorProps {
  product: {
    id: string;
    name: string;
    sellingPrice: number;
    newPrice?: number | null;
    imageUrl?: string;
    installmentPlan?: InstallmentPlan;
  };
  onSuccess?: (orderId: string) => void;
}

const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone number required'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface SelectedPlan {
  downPayment: number;
  perInstallment: number;
  totalPayments: number;
  schedule: { number: number; dueDate: Date; amount: number }[];
  startDate: Date;
}

export function InstallmentSelector({ product, onSuccess }: InstallmentSelectorProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  
  const installmentPlan = product.installmentPlan;

  // Calculate plan details
  const effectivePrice = product.newPrice || product.sellingPrice;
  
  const calculatePlan = (plan: InstallmentPlan, startDate: Date): SelectedPlan | null => {
    if (!plan.enabled || effectivePrice <= 0) return null;

    const downPayment = effectivePrice * (plan.downPaymentPercent / 100);
    const remainingAmount = effectivePrice - downPayment;
    const perInstallment = remainingAmount / plan.numberOfPayments;

    const schedule: { number: number; dueDate: Date; amount: number }[] = [];
    for (let i = 0; i < plan.numberOfPayments; i++) {
      let dueDate: Date;
      switch (plan.interval) {
        case 'daily':
          dueDate = addDays(startDate, i + 1);
          break;
        case 'weekly':
          dueDate = addWeeks(startDate, i + 1);
          break;
        case 'monthly':
          dueDate = addMonths(startDate, i + 1);
          break;
        case 'custom':
          dueDate = addDays(startDate, (plan.customIntervalDays || 14) * (i + 1));
          break;
      }
      schedule.push({ number: i + 1, dueDate, amount: perInstallment });
    }

    return {
      downPayment,
      perInstallment,
      totalPayments: plan.numberOfPayments,
      schedule,
      startDate,
    };
  };

  const defaultStartDate = useMemo(() => {
    return installmentPlan?.startDate ? new Date(installmentPlan.startDate) : new Date();
  }, [installmentPlan?.startDate]);

  const calculatedPlan = useMemo(() => {
    if (!installmentPlan?.enabled) return null;
    return calculatePlan(installmentPlan, customStartDate || defaultStartDate);
  }, [installmentPlan, customStartDate, defaultStartDate]);

  // Customer form
  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: user?.displayName || '',
      email: user?.email || '',
      phone: '',
    },
  });

  if (!installmentPlan?.enabled || !calculatedPlan) {
    return null;
  }

  const handleSelectPlan = (index: number) => {
    setSelectedPaymentIndex(index);
    setIsDialogOpen(true);
  };

  const handleStartInstallment = async (values: CustomerFormValues) => {
    if (!firestore || !user || !currentStoreId || selectedPaymentIndex === null) return;
    
    setIsSubmitting(true);
    try {
      const batch = writeBatch(firestore);
      
      // Create installment order
      const orderData: Omit<InstallmentOrder, 'id'> = {
        store_id: currentStoreId,
        customerId: user.uid,
        customerName: values.name,
        customerEmail: values.email || undefined,
        customerPhone: values.phone,
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl,
        totalAmount: effectivePrice,
        firstPayment: calculatedPlan!.downPayment,
        remainingBalance: effectivePrice - calculatedPlan!.downPayment,
        installmentsPaid: 0,
        installmentsRemaining: calculatedPlan!.totalPayments,
        nextDueDate: calculatedPlan!.schedule[0].dueDate,
        lastPaymentDate: null,
        status: 'active',
        paymentSchedule: calculatedPlan!.schedule.map(s => ({
          installmentNumber: s.number,
          dueDate: s.dueDate,
          amount: s.amount,
          status: 'pending' as const,
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        staffId: user.uid,
        staffName: user.displayName || user.email || 'Customer',
        lateFeesApplied: 0,
        totalLateFees: 0,
      };

      const orderRef = doc(collection(firestore, 'installmentOrders'));
      batch.set(orderRef, orderData);

      // Deduct stock (1 unit for the order)
      const productRef = doc(firestore, 'products', product.id);
      batch.update(productRef, {
        stock: product.stock - 1,
        updatedAt: Timestamp.now(),
      });

      await batch.commit();

      toast({ 
        title: "Installment Started!", 
        description: `Your payment plan has been created. First payment: ${currencySymbol}${calculatedPlan!.downPayment.toLocaleString()}` 
      });
      
      setIsDialogOpen(false);
      customerForm.reset();
      
      if (onSuccess) {
        onSuccess(orderRef.id);
      } else {
        router.push(`/account/installments`);
      }
    } catch (error: any) {
      console.error("Error starting installment:", error);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstPaymentDue = calculatedPlan.schedule[0]?.dueDate;
  const progressPercent = 0; // Just starting

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Pay Small Small / Installments</h3>
            <p className="text-sm text-muted-foreground">Buy now, pay later in affordable installments</p>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white dark:bg-black/50 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Price</p>
            <p className="text-lg font-black">{currencySymbol}{effectivePrice.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Down Payment</p>
            <p className="text-lg font-black text-green-600">{currencySymbol}{calculatedPlan.downPayment.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-black/50 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Per Installment</p>
            <p className="text-lg font-black text-primary">{currencySymbol}{calculatedPlan.perInstallment.toLocaleString()}</p>
          </div>
        </div>

        {/* Plan Details */}
        <div className="bg-white dark:bg-black/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Payment every {installmentPlan.interval === 'custom' ? `${installmentPlan.customIntervalDays || 14} days` : installmentPlan.interval}</span>
            </div>
            <Badge variant="secondary">{calculatedPlan.totalPayments} installments</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>First payment due</span>
            </div>
            <span className="font-bold">{firstPaymentDue ? format(firstPaymentDue, 'MMMM dd, yyyy') : 'Today'}</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          onClick={() => handleSelectPlan(0)}
          className="w-full mt-4 h-12 rounded-xl font-bold text-base gap-2"
        >
          <Calculator className="h-5 w-5" />
          Start Installment Plan
          <ArrowRight className="h-5 w-5" />
        </Button>

        {/* Payment Schedule Preview */}
        <div className="mt-4 pt-4 border-t border-primary/10">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Payment Schedule Preview</h4>
          <div className="space-y-2">
            {calculatedPlan.schedule.slice(0, 3).map((item) => (
              <div key={item.number} className="flex items-center justify-between text-sm bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {item.number}
                  </div>
                  <span>{format(item.dueDate, 'MMM dd, yyyy')}</span>
                </div>
                <span className="font-bold">{currencySymbol}{item.amount.toLocaleString()}</span>
              </div>
            ))}
            {calculatedPlan.totalPayments > 3 && (
              <p className="text-xs text-center text-muted-foreground py-2">
                + {calculatedPlan.totalPayments - 3} more payment(s)
              </p>
            )}
          </div>
        </div>

        {/* Terms Link */}
        {installmentPlan.terms && (
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p>{installmentPlan.terms}</p>
          </div>
        )}
      </div>

      {/* Start Installment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Start Installment Plan</DialogTitle>
                <DialogDescription>{product.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Product Summary */}
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
            {product.imageUrl && (
              <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted">
                <Image src={product.imageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold line-clamp-2">{product.name}</p>
              <p className="text-2xl font-black text-primary">{currencySymbol}{effectivePrice.toLocaleString()}</p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-sm">Payment Breakdown</h4>
            <div className="flex items-center justify-between text-sm">
              <span>Down Payment (Today)</span>
              <span className="font-bold text-green-600">{currencySymbol}{calculatedPlan.downPayment.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Remaining ({calculatedPlan.totalPayments} installments)</span>
              <span className="font-bold">{currencySymbol}{(effectivePrice - calculatedPlan.downPayment).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Per Installment</span>
              <span className="font-bold">{currencySymbol}{calculatedPlan.perInstallment.toLocaleString()}</span>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Payment Schedule</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {calculatedPlan.schedule.map((item) => (
                <div 
                  key={item.number} 
                  className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{item.number}</span>
                    <span className="text-muted-foreground">{format(item.dueDate, 'MMM dd')}</span>
                  </div>
                  <span className="font-bold">{currencySymbol}{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Info Form */}
          <form onSubmit={customerForm.handleSubmit(handleStartInstallment)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Full Name
              </Label>
              <Input 
                id="name" 
                {...customerForm.register('name')} 
                placeholder="Enter your full name"
              />
              {customerForm.formState.errors.name && (
                <p className="text-xs text-destructive">{customerForm.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone Number
              </Label>
              <Input 
                id="phone" 
                {...customerForm.register('phone')} 
                placeholder="+234..."
                type="tel"
              />
              {customerForm.formState.errors.phone && (
                <p className="text-xs text-destructive">{customerForm.formState.errors.phone.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email (Optional)
              </Label>
              <Input 
                id="email" 
                {...customerForm.register('email')} 
                placeholder="your@email.com"
                type="email"
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <p>By starting this installment plan, you agree to make timely payments. Late payments may incur additional fees.</p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Start Installment - Pay {currencySymbol}{calculatedPlan.downPayment.toLocaleString()} Now
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InstallmentSelector;