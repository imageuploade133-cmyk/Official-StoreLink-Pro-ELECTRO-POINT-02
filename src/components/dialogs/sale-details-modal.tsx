
"use client"

import type React from "react"
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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Items Purchased</h2>
            <p className="text-sm text-muted-foreground">
                {items.length} product types.
                {totalReturnedItems > 0 && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">({totalReturnedItems} items returned)</span>
                )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.productName}</h3>
                {item.variantName && <p className="text-sm text-muted-foreground">Variant: {item.variantName}</p>}
                <p className="text-sm text-muted-foreground font-mono">
                  {formatCurrency(item.unitPrice, currencySymbol)} each
                </p>
              </div>
              <div className="text-right ml-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{item.quantity}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold font-mono">
                      {formatCurrency(item.totalPrice, currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="flex items-center justify-between text-lg font-semibold">
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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Payment Details</h2>
            <p className="text-sm text-muted-foreground">Transaction financial information</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Payment Method</span>
            </div>
            <div className="font-semibold">{transaction.paymentMethod}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
            </div>
            <div className="font-semibold font-mono">
              {formatCurrency(transaction.subtotal, currencySymbol)}
            </div>
          </div>
          {transaction.taxAmountCalculated && transaction.taxAmountCalculated > 0 && (
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Tax Collected</span>
              </div>
              <div className="font-semibold font-mono text-blue-600">
                {formatCurrency(transaction.taxAmountCalculated, currencySymbol)} ({transaction.taxRate}%)
              </div>
            </div>
          )}
        </div>
        {transaction.paymentDetails && (
          <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
            {hasSplitPayment ? (
                <div>
                    <h4 className="font-medium text-sm mb-2">Split Payment:</h4>
                    {transaction.paymentDetails.methods?.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">{getPaymentMethodIcon(p.method)} {p.method}:</span>
                            <span className="font-mono">{formatCurrency(p.amount, currencySymbol)}</span>
                        </div>
                    ))}
                </div>
            ) : null }
            {typeof transaction.paymentDetails.amountTendered === 'number' && (
                <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Amount Tendered:</span>
                    <span className="font-mono">{formatCurrency(transaction.paymentDetails.amountTendered, currencySymbol)}</span>
                </div>
            )}
             {typeof transaction.paymentDetails.changeGiven === 'number' && transaction.paymentDetails.changeGiven > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                    <span className="font-medium">Change Given:</span>
                    <span className="font-mono font-semibold">{formatCurrency(transaction.paymentDetails.changeGiven, currencySymbol)}</span>
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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Staff Details</h2>
            <p className="text-sm text-muted-foreground">Staff member who processed the sale</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="p-4 rounded-lg bg-muted/30 border">
            <p className="text-sm"><span className="font-medium text-muted-foreground">Name:</span> {staffMember?.name || 'Admin / System User'}</p>
            <p className="text-sm"><span className="font-medium text-muted-foreground">Email:</span> {staffMember?.email || 'N/A'}</p>
        </div>
      </CardContent>
    </Card>
  );
};


const NotesSection: React.FC<{ notes?: string | null }> = ({ notes }) => {
    if (!notes) return null;
    return (
        <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <StickyNote className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                <h2 className="text-lg font-semibold">Additional Notes</h2>
                <p className="text-sm text-muted-foreground">Transaction notes and comments</p>
                </div>
            </div>
            </CardHeader>
            <CardContent className="pt-0">
            <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
            </CardContent>
        </Card>
    );
};

const ReturnsSection: React.FC<{ returns?: SaleReturn[]; currencySymbol: string }> = ({ returns, currencySymbol }) => {
    if (!returns || returns.length === 0) return null;
    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Undo2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Returned Items</h2>
                        <p className="text-sm text-muted-foreground">Log of all returned items from this sale</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                {returns.map((ret, index) => {
                  const returnDate = convertToDateSafely(ret.returnedAt);
                  return (
                    <div key={index} className="p-4 rounded-lg border bg-muted/40">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="font-semibold">Return on {returnDate ? format(returnDate, "MMM dd, yyyy 'at' h:mm a") : 'N/A'}</p>
                                {ret.staffId && <p className="text-xs text-muted-foreground">Staff ID: {ret.staffId.substring(0, 8)}</p>}
                            </div>
                            <Badge variant="destructive">Refund: {formatCurrency(ret.totalReturnedAmount, currencySymbol)}</Badge>
                        </div>
                        {ret.reason && <p className="text-xs text-muted-foreground italic mb-2">Reason: {ret.reason}</p>}
                        <div className="space-y-1">
                            {ret.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex justify-between items-center text-sm">
                                    <span>{item.productName}</span>
                                    <span>Qty: {item.quantity}</span>
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
      <DialogContent className="max-w-4xl p-0 h-[90vh] sm:h-[85vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-tight">Transaction Details</span>
          </DialogTitle>
          <DialogDescription className="mt-1 text-left">
            ID: <span className="font-mono">{saleTransaction.id}</span>
            <br />
            Date: {saleDate ? format(saleDate, "EEEE, MMMM do, yyyy 'at' h:mm a") : 'Invalid Date'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <DollarSign className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-2xl font-bold font-mono">
                  {formatCurrency(netTotal, currencySymbol)}
                </div>
                <div className="text-xs text-muted-foreground">Net Total</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <Package className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {saleTransaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Items Sold</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <UserCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm font-medium truncate">{saleTransaction.customerName || "Walk-in"}</div>
                <div className="text-xs text-muted-foreground">Customer</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <CreditCard className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm font-medium">{saleTransaction.paymentMethod}</div>
                <div className="text-xs text-muted-foreground">Payment</div>
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

        <DialogFooter className="mt-auto pt-4 p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            {saleTransaction.isCreditSale && !saleTransaction.isPaid && onRecordPayment && (
                <Button 
                    variant="outline" 
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={handleRecordPaymentInternal}
                >
                    <Wallet className="mr-2 h-4 w-4" /> Record Payment
                </Button>
            )}
          </div>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
