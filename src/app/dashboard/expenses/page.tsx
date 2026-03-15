'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, orderBy, addDoc, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { convertToDateSafely } from '@/lib/utils';

import type { SaleTransaction, Expense, Reversal, PaymentMethod as CustomPaymentMethod } from '@/lib/types';
import type { ExpenseFormValues } from '@/components/expenses/ExpenseForm';
import type { CashDepositFormValues } from '@/components/dialogs/CashDepositDialog';

import AccessDenied from '@/components/staff-management/AccessDenied';
import { SummaryCards } from '@/components/expenses/SummaryCards';
import { AccountBalances } from '@/components/expenses/AccountBalances';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseHistory } from '@/components/expenses/ExpenseHistory';
import { CashDepositDialog } from '@/components/dialogs/CashDepositDialog';
import { AdminAuthDialog } from '@/components/dialogs/AdminAuthDialog';
import { PageHeader } from '@/components/PageHeader';

import { Receipt, Loader2 } from 'lucide-react';


export default function ExpensesPage() {
  const { user, permissions, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const firebaseAuth = getAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [expenseToReturn, setExpenseToReturn] = useState<Expense | null>(null);

  const salesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'saleTransactions'));
  }, [firestore]);

  const expensesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'expenses'));
  }, [firestore]);

  const reversalsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'reversals'), orderBy("reversalDate", "desc"));
  }, [firestore]);

  const { data: rawSales, isLoading: isLoadingSales } = useCollection<SaleTransaction>(salesQuery);
  const { data: rawExpenses, isLoading: isLoadingExpenses, refetch: refetchExpenses } = useCollection<Expense>(expensesQuery);
  const { data: allReversals, isLoading: isLoadingReversals } = useCollection<Reversal>(reversalsQuery);
  
  const allSales = useMemo(() => rawSales || [], [rawSales]);
  
  const allExpenses = useMemo(() => {
    if (!rawExpenses) return [];
    return [...rawExpenses]
        .map(e => ({...e, expenseDate: convertToDateSafely(e.expenseDate)}))
        .sort((a, b) => (b.expenseDate?.getTime() ?? 0) - (a.expenseDate?.getTime() ?? 0));
  }, [rawExpenses]);

  const isLoadingData = isLoadingSales || isLoadingExpenses || isLoadingReversals;

  const paymentMethods = useMemo<CustomPaymentMethod[]>(() => settings?.paymentMethods || [{ id: 'cash', name: 'Cash' }], [settings]);

  const { totalRevenue, totalExpenses, balanceByMethod, totalBankBalance, totalCashOnHand, netBalance } = useMemo(() => {
    const methodBalances: Record<string, number> = {};
    paymentMethods.forEach(method => methodBalances[method.name] = 0);
    
    allSales.forEach(sale => {
      if(!sale.isCreditSale && sale.paymentMethod && methodBalances[sale.paymentMethod] !== undefined) {
         const netSale = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
         methodBalances[sale.paymentMethod] += netSale;
      }
      if(sale.isCreditSale && Array.isArray(sale.paymentHistory)) {
        sale.paymentHistory.forEach(p => {
            if(p.paymentMethod && methodBalances[p.paymentMethod] !== undefined) {
              methodBalances[p.paymentMethod] += p.amountPaid;
            }
        });
      }
    });

    allExpenses.forEach(expense => {
      if (expense.status === 'Returned') return;
      if (expense.useMultipleAccounts && expense.multiAccountPayments) {
        expense.multiAccountPayments.forEach(p => {
          if (p.method && methodBalances[p.method] !== undefined && p.amount > 0) {
            methodBalances[p.method] -= p.amount;
          }
        });
      } else if (expense.category === 'Cash Deposit' && expense.depositToMethod) {
        if (methodBalances['Cash'] !== undefined) methodBalances['Cash'] -= expense.amount;
        if (methodBalances[expense.depositToMethod] !== undefined) methodBalances[expense.depositToMethod] += expense.amount;
      } else if(expense.paymentMethod && methodBalances[expense.paymentMethod] !== undefined) {
        methodBalances[expense.paymentMethod] -= expense.amount;
      }
    });

    (allReversals || []).forEach(reversal => {
        const { paymentMethod, multiAccountPayments, amount } = reversal.originalExpenseData;
        if (multiAccountPayments && multiAccountPayments.length > 0) {
            multiAccountPayments.forEach(p => {
                if(p.method && methodBalances[p.method] !== undefined) {
                    methodBalances[p.method] += p.amount;
                }
            });
        } else if (paymentMethod && methodBalances[paymentMethod] !== undefined) {
            methodBalances[paymentMethod] += amount;
        }
    });
    
    const revenueTotal = allSales.reduce((sum, sale) => sum + ((sale.grandTotal || 0) - (sale.returnedAmount || 0)), 0);
    const expensesTotal = allExpenses.filter(e => e.status !== 'Returned' && e.category !== 'Cash Deposit').reduce((sum, expense) => sum + expense.amount, 0);
    const bankTotal = Object.entries(methodBalances).filter(([key]) => key.toLowerCase() !== 'cash').reduce((sum, [, value]) => sum + value, 0);

    return {
      totalRevenue: revenueTotal,
      totalExpenses: expensesTotal,
      netBalance: revenueTotal - expensesTotal,
      balanceByMethod: methodBalances,
      totalBankBalance: bankTotal,
      totalCashOnHand: methodBalances['Cash'] || 0,
    };
  }, [allSales, allExpenses, allReversals, paymentMethods]);
  
  const handleAddExpense = async (values: ExpenseFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
        const expenseData = { ...values, recordedBy: user.uid, branchId: null, status: 'Active' as const, expenseDate: Timestamp.fromDate(values.expenseDate) };
        await addDoc(collection(firestore, 'expenses'), expenseData);
        toast({ title: "Expense Added", description: "Your expense has been successfully recorded." });
        if(refetchExpenses) await refetchExpenses();
    } catch(e: any) {
        console.error("Error adding expense:", e);
        toast({ variant: 'destructive', title: "Error", description: "Failed to add expense." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCashDeposit = async (values: CashDepositFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
        const depositData: Omit<Expense, 'id'> = {
            description: `Cash Deposit to ${values.destinationMethod}`,
            amount: values.amount,
            category: 'Cash Deposit',
            paymentMethod: 'Cash',
            depositToMethod: values.destinationMethod,
            expenseDate: Timestamp.fromDate(values.depositDate),
            notes: values.notes,
            branchId: null,
            recordedBy: user.uid,
            status: 'Active',
        };
        await addDoc(collection(firestore, 'expenses'), depositData);
        toast({ title: "Cash Deposit Recorded", description: "The transaction has been successfully logged." });
        if(refetchExpenses) await refetchExpenses();
        setIsDepositModalOpen(false);
    } catch(e: any) {
        console.error("Error recording cash deposit:", e);
        toast({ variant: 'destructive', title: "Error", description: "Failed to record cash deposit." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const initiateReturnExpense = (expense: Expense) => {
    setExpenseToReturn(expense);
    setIsAuthDialogOpen(true);
  };
  
  const handleAuthenticatedReturn = async (password: string, email: string) => {
      if (!expenseToReturn || !firebaseAuth.currentUser || firebaseAuth.currentUser.email !== email || !firestore) {
          toast({ variant: 'destructive', title: 'Authorization Failed' });
          setIsAuthDialogOpen(false);
          return;
      }
      setIsProcessingReturn(true);
      const credential = EmailAuthProvider.credential(email, password);
      try {
          await reauthenticateWithCredential(firebaseAuth.currentUser, credential);
          const batch = writeBatch(firestore);
          const expenseRef = doc(firestore, 'expenses', expenseToReturn.id);
          const reversalRef = doc(collection(firestore, 'reversals'));

          const reversalData: Omit<Reversal, 'id'> = {
              originalExpenseId: expenseToReturn.id,
              originalExpenseData: expenseToReturn,
              reversalDate: Timestamp.now(),
              reversedBy: firebaseAuth.currentUser?.uid,
              reversedByEmail: firebaseAuth.currentUser?.email,
          };
          
          batch.update(expenseRef, { status: 'Returned' });
          batch.set(reversalRef, reversalData);

          await batch.commit();
          toast({ title: "Success", description: "Expense successfully returned." });
          if(refetchExpenses) await refetchExpenses();
          setIsAuthDialogOpen(false);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Return Failed', description: error.message });
      } finally {
          setIsProcessingReturn(false);
          setExpenseToReturn(null);
      }
  };

  if (isAuthLoading || isSettingsLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if (!permissions?.canManageExpenses) return <AccessDenied />;
  
  return (
    <>
    <div className="space-y-6">
        <PageHeader
          icon={Receipt}
          title="Expense Management"
          description="Track and manage all business-related expenses and account balances."
        />
        
        <SummaryCards
          isLoading={isLoadingData}
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          netBalance={netBalance}
          currencySymbol={settings?.currency || '$'}
        />
        
        <AccountBalances
            isLoading={isLoadingData}
            totalBankBalance={totalBankBalance}
            totalCashOnHand={totalCashOnHand}
            balanceByMethod={balanceByMethod}
            paymentMethods={paymentMethods.map(pm => pm.name)}
            currencySymbol={settings?.currency || '$'}
            onDepositClick={() => setIsDepositModalOpen(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <ExpenseForm 
                    onAddExpense={handleAddExpense} 
                    isSubmitting={isSubmitting} 
                    balanceByMethod={balanceByMethod}
                />
            </div>

            <div className="lg:col-span-2">
                <ExpenseHistory
                    expenses={allExpenses}
                    isLoading={isLoadingData}
                    isAdmin={isAdmin}
                    onReturnExpense={initiateReturnExpense}
                />
            </div>
        </div>
    </div>
    <AdminAuthDialog
        isOpen={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onConfirm={handleAuthenticatedReturn}
        isProcessing={isProcessingReturn}
        title="Authorize Expense Return"
        description={`This will reverse the expense. Please confirm your identity.`}
        confirmButtonText="Confirm & Return Expense"
        userEmail={firebaseAuth.currentUser?.email || ''}
    />
    <CashDepositDialog
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSubmit={handleCashDeposit}
        paymentMethods={paymentMethods.filter(m => m.name.toLowerCase() !== 'cash')}
        isSubmitting={isSubmitting}
        currencySymbol={settings?.currency || '$'}
        cashBalance={totalCashOnHand}
        allBalances={balanceByMethod}
    />
    </>
  );
}
