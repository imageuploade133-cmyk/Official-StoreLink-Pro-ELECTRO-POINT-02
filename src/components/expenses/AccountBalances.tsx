'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

interface AccountBalancesProps {
    isLoading: boolean;
    totalBankBalance: number;
    totalCashOnHand: number;
    balanceByMethod: Record<string, number>;
    paymentMethods: string[];
    currencySymbol: string;
    onDepositClick: () => void;
}

export function AccountBalances({ isLoading, totalBankBalance, totalCashOnHand, balanceByMethod, paymentMethods, currencySymbol, onDepositClick }: AccountBalancesProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wallet/> Account Balances by Method</CardTitle>
                <CardDescription>Estimated balance per payment method (All Time Revenue IN - Expenses OUT).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="shadow-lg border-teal-500/20 bg-teal-500/5">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-semibold text-teal-600">Total In Bank</CardTitle>
                          <Landmark className="h-5 w-5 text-teal-600" />
                      </CardHeader>
                      <CardContent>
                          {isLoading ? <Skeleton className="h-8 w-40"/> : <div className="text-3xl font-bold text-teal-600 break-words">{formatCurrency(totalBankBalance, currencySymbol)}</div>}
                          <p className="text-xs text-teal-600/80">Sum of all non-cash balances.</p>
                      </CardContent>
                  </Card>
                  <Card className="shadow-lg border-yellow-500/20 bg-yellow-500/5">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-semibold text-yellow-700">Total Cash on Hand</CardTitle>
                          <Wallet className="h-5 w-5 text-yellow-700" />
                      </CardHeader>
                      <CardContent>
                          {isLoading ? <Skeleton className="h-8 w-40"/> : <div className="text-3xl font-bold text-yellow-800 break-words">{formatCurrency(totalCashOnHand, currencySymbol)}</div>}
                          <p className="text-xs text-yellow-700/80">Estimated cash balance.</p>
                      </CardContent>
                  </Card>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-4 border-t">
                  {isLoading ? (
                      Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-24 w-full" />)
                  ) : paymentMethods.length > 0 ? (
                      paymentMethods.map(method => (
                          <Card key={method} className="text-center p-4 flex flex-col justify-between shadow-sm h-full hover:bg-muted/50 transition-colors">
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground">{method}</p>
                                <p className={cn("text-2xl font-bold", (balanceByMethod[method] || 0) >= 0 ? 'text-primary' : 'text-destructive' )}>
                                    {formatCurrency(balanceByMethod[method] || 0, currencySymbol)}
                                </p>
                              </div>
                          </Card>
                      ))
                  ) : (
                    <div className="col-span-full text-center py-6 text-muted-foreground">
                        <p>No payment methods configured in settings.</p>
                    </div>
                  )}
              </div>
            </CardContent>
             <CardFooter>
                <Button variant="secondary" onClick={onDepositClick}>
                    <Landmark className="mr-2 h-4 w-4"/> Record Cash Deposit
                </Button>
            </CardFooter>
        </Card>
    );
}
