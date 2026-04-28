
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SaleTransaction, SaleTransactionItem, SaleReturn, StaffMember } from "@/lib/types"
import { format } from "date-fns"
import {
  UserCircle,
  CreditCard,
  DollarSign,
  ShoppingBag,
  StickyNote,
  Package,
  Landmark,
  Calculator,
  Undo2,
  Briefcase,
  Banknote,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from "../ui/badge"
import { convertToDateSafely } from "@/lib/utils"

interface SaleDetailsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void;
  saleTransaction: SaleTransaction | null
  currencySymbol: string;
  staffMap: Map<string, StaffMember>;
  onRecordPayment?: (sale: SaleTransaction) => void;
}

const ItemsSection: React.FC<{
  items: (SaleTransactionItem & { variantName?: string })[]
  subtotal: number
  currencySymbol: string
  totalReturnedItems: number
}> = ({ items, subtotal, currencySymbol, totalReturnedItems }) => {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Items Purchased</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
                {items.length} product types.
                {totalReturnedItems > 0 && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">({totalReturnedItems} items returned)</span>
                )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="space-y-2 sm:space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-2 sm:gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">{item.productName}</h3>
                {item.variantName && <p className="text-xs text-muted-foreground">Variant: {item.variantName}</p>}
                <p className="text-[10px] sm:text-sm text-muted-foreground font-mono">
                  {formatCurrency(item.unitPrice, currencySymbol)} each
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:ml-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-bold text-primary">{item.quantity}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold sm:font-semibold font-mono text-sm sm:text-base">
                    {formatCurrency(item.totalPrice, currencySymbol)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Separator className="my-3 sm:my-4" />
        <div className="flex items-center justify-between text-base sm:text-lg font-bold sm:font-semibold">
          <span>Subtotal</span>
          <span className="font-mono">{formatCurrency(subtotal, currencySymbol)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

const getPaymentMethodIcon = (method: string) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('cash')) return <Banknote className="h-4 w-4" />;
    if (lowerMethod.includes('card')) return <CreditCard className="h-4 w-4" />;
    if (lowerMethod.includes('transfer')) return <Wallet className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
};


const PaymentSection: React.FC<{
  transaction: SaleTransaction
  currencySymbol: string
}> = ({ transaction, currencySymbol }) => {
    const hasSplitPayment = transaction.paymentDetails?.methods && transaction.paymentDetails.methods.length > 0;
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Payment Details</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Transaction financial information</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase">Method</span>
            </div>
            <div className="font-bold sm:font-semibold text-sm sm:text-base">{transaction.paymentMethod}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Calculator className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase">Subtotal</span>
            </div>
            <div className="font-bold sm:font-semibold font-mono text-sm sm:text-base">
              {formatCurrency(transaction.subtotal, currencySymbol)}
            </div>
          </div>
          {transaction.taxAmountCalculated && transaction.taxAmountCalculated > 0 && (
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <Calculator className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <span className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase">Tax Collected</span>
              </div>
              <div className="font-bold sm:font-semibold font-mono text-blue-600 text-sm sm:text-base">
                {formatCurrency(transaction.taxAmountCalculated, currencySymbol)} ({transaction.taxRate}%)
              </div>
            </div>
          )}
        </div>
        {transaction.paymentDetails && (
          <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border space-y-2">
            {hasSplitPayment ? (
                <div className="space-y-2">
                    <h4 className="font-bold text-[10px] sm:text-xs uppercase text-muted-foreground">Split Payment:</h4>
                    {transaction.paymentDetails.methods?.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="flex items-center gap-2">{getPaymentMethodIcon(p.method)} {p.method}:</span>
                            <span className="font-mono font-bold">{formatCurrency(p.amount, currencySymbol)}</span>
                        </div>
                    ))}
                </div>
            ) : null }
            {typeof transaction.paymentDetails.amountTendered === 'number' && (
                <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Amount Tendered:</span>
                    <span className="font-mono font-bold">{formatCurrency(transaction.paymentDetails.amountTendered, currencySymbol)}</span>
                </div>
            )}
             {typeof transaction.paymentDetails.changeGiven === 'number' && transaction.paymentDetails.changeGiven > 0 && (
                <div className="flex justify-between text-xs sm:text-sm text-blue-600">
                    <span className="font-bold">Change Given:</span>
                    <span className="font-mono font-black">{formatCurrency(transaction.paymentDetails.changeGiven, currencySymbol)}</span>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const StaffSection: React.FC<{
  staffId?: string;
  staffMap: Map<string, StaffMember>;
}> = ({ staffId, staffMap }) => {
  if (!staffId) return null;
  const staffMember = staffMap.get(staffId);

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Staff Details</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Processed the sale</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2">
        <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border">
            <p className="text-xs sm:text-sm"><span className="font-bold text-muted-foreground uppercase text-[10px] sm:text-xs">Name:</span> {staffMember?.name || 'Admin / System User'}</p>
            <p className="text-xs sm:text-sm"><span className="font-bold text-muted-foreground uppercase text-[10px] sm:text-xs">Email:</span> {staffMember?.email || 'N/A'}</p>
        </div>
      </CardContent>
    </Card>
  );
};


const NotesSection: React.FC<{ notes?: string | null }> = ({ notes }) => {
    if (!notes) return null;
    return (
        <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <StickyNote className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                <h2 className="text-base sm:text-lg font-semibold">Additional Notes</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Transaction notes and comments</p>
                </div>
            </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border">
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
            </CardContent>
        </Card>
    );
};

const ReturnsSection: React.FC<{ returns?: SaleReturn[]; currencySymbol: string }> = ({ returns, currencySymbol }) => {
    if (!returns || returns.length === 0) return null;
    return (
        <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                        <Undo2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold">Returned Items</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">Log of returned items</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                {returns.map((ret, index) => {
                  const returnDate = convertToDateSafely(ret.returnedAt);
                  return (
                    <div key={index} className="p-3 sm:p-4 rounded-lg border bg-muted/40">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                            <div>
                                <p className="font-bold text-sm">Return on {returnDate ? formatDate(returnDate, "MMM dd, yyyy") : 'N/A'}</p>
                                {ret.staffId && <p className="text-[10px] text-muted-foreground">Staff ID: {ret.staffId.substring(0, 8)}</p>}
                            </div>
                            <Badge variant="destructive" className="text-[10px] font-black">{formatCurrency(ret.totalReturnedAmount, currencySymbol)}</Badge>
                        </div>
                        {ret.reason && <p className="text-[10px] sm:text-xs text-muted-foreground italic mb-2">Reason: {ret.reason}</p>}
                        <div className="space-y-1">
                            {ret.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex justify-between items-center text-[10px] sm:text-sm">
                                    <span className="font-medium">{item.productName}</span>
                                    <span className="font-bold">Qty: {item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  );
                })}
            </CardContent>
        </Card>
    );
};


export function SaleDetailsModal({ isOpen, onOpenChange, saleTransaction, currencySymbol, staffMap, onRecordPayment }: SaleDetailsModalProps) {
  if (!saleTransaction) return null;

  const saleDate = convertToDateSafely(saleTransaction.createdAt);
  const netTotal = (saleTransaction.grandTotal || 0) - (saleTransaction.returnedAmount || 0);

  const totalReturnedItems = saleTransaction.returns?.reduce(
      (sum, currentReturn) => sum + currentReturn.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0) || 0;

  const handleRecordPaymentInternal = () => {
    if (onRecordPayment) {
        onRecordPayment(saleTransaction);
        onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] p-0 h-[90vh] sm:h-[85vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-left">Transaction Details</span>
          </DialogTitle>
          <DialogDescription className="mt-1 text-left text-xs sm:text-sm">
            ID: <span className="font-mono break-all">{saleTransaction.id}</span>
            <br />
            Date: {saleDate ? format(saleDate, "EEEE, MMM do, yyyy 'at' h:mm a") : 'Invalid Date'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/30">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mx-auto mb-1 sm:mb-2" />
                <div className="text-lg sm:text-2xl font-bold font-mono">
                  {formatCurrency(netTotal, currencySymbol)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Net Total</div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/30">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mx-auto mb-1 sm:mb-2" />
                <div className="text-lg sm:text-2xl font-bold">
                  {saleTransaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Items Sold</div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/30">
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mx-auto mb-1 sm:mb-2" />
                <div className="text-xs sm:text-sm font-medium truncate">{saleTransaction.customerName || "Walk-in"}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Customer</div>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-xl bg-muted/30">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mx-auto mb-1 sm:mb-2" />
                <div className="text-xs sm:text-sm font-medium truncate">{saleTransaction.paymentMethod}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">Payment</div>
              </div>
            </div>

            <ItemsSection
              items={saleTransaction.items}
              subtotal={saleTransaction.subtotal}
              currencySymbol={currencySymbol}
              totalReturnedItems={totalReturnedItems}
            />

            <PaymentSection transaction={saleTransaction} currencySymbol={currencySymbol} />
            
            <StaffSection staffId={saleTransaction.staffId} staffMap={staffMap} />

            <ReturnsSection returns={saleTransaction.returns} currencySymbol={currencySymbol} />

            {saleTransaction.notes && <NotesSection notes={saleTransaction.notes} />}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            {saleTransaction.isCreditSale && !saleTransaction.isPaid && onRecordPayment && (
                <Button 
                    variant="outline" 
                    className="bg-primary text-white hover:bg-primary/90 flex-1 sm:flex-none"
                    onClick={handleRecordPaymentInternal}
                >
                    <Wallet className="mr-2 h-4 w-4" /> Record Payment
                </Button>
            )}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
