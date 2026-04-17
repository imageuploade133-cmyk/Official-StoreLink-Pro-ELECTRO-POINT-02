'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ShoppingCart as ShoppingCartIcon,
  Trash2,
  ListChecks,
  Clock,
  UserPlus,
  Calculator,
  CreditCard as CreditCardIconLucide,
  PauseCircle,
  X,
  Check as CheckIconLucide,
  PlusIcon as PlusIconLucide,
  MinusIcon as MinusIconLucide,
  Loader2,
  Ban,
  BadgeDollarSign,
  SlidersHorizontal,
  Tag,
  PiggyBank
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { CartItem, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';

interface CartAreaProps {
  cartItems: CartItem[];
  selectedCustomer: Customer | null;
  manualCustomerName: string;
  manualCustomerPhone: string;
  isProcessingSale: boolean;
  currencySymbol: string;
  subtotal: number;
  grandTotal: number;
  discountAmount: number;
  discount: { type: 'percentage' | 'fixed' | null; value: number };
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCustomerSelect: (customer: Customer) => void;
  onClearCustomer: () => void;
  onManualCustomerNameChange: (name: string) => void;
  onManualCustomerPhoneChange: (phone: string) => void;
  onOpenSalesHistory: () => void;
  onOpenHeldSales: () => void;
  onOpenCustomerManagement: () => void;
  onOpenCalculator: () => void;
  onInitiatePayment: () => void;
  onInitiateCreditSale: () => void;
  onInitiateHoldSale: () => void;
  onApplyDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  onClearDiscount: () => void;
}

export function CartArea({
  cartItems,
  selectedCustomer,
  manualCustomerName,
  manualCustomerPhone,
  isProcessingSale,
  currencySymbol,
  subtotal,
  grandTotal,
  discountAmount,
  discount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onClearCustomer,
  onManualCustomerNameChange,
  onManualCustomerPhoneChange,
  onOpenSalesHistory,
  onOpenHeldSales,
  onOpenCustomerManagement,
  onOpenCalculator,
  onInitiatePayment,
  onInitiateCreditSale,
  onInitiateHoldSale,
  onApplyDiscount,
  onClearDiscount,
}: CartAreaProps) {
    const { settings } = useSettings();
    const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';

    const [localDiscountType, setLocalDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [localDiscountValue, setLocalDiscountValue] = useState('');


    const handleQuantityChange = (productId: string, value: string) => {
        const newQuantity = parseInt(value, 10);
        if (isNaN(newQuantity) || newQuantity < 1) {
            onUpdateQuantity(productId, 1); // Reset to 1 if input is invalid/empty
            return;
        }
        onUpdateQuantity(productId, newQuantity);
    }

    const handleApplyDiscountClick = () => {
        const value = parseFloat(localDiscountValue);
        if (!isNaN(value)) {
            onApplyDiscount(localDiscountType, value);
        }
    };
    
    return (
        <Card className="flex-1 flex flex-col min-h-0 ">
            <CardHeader className="pb-3">
            <div className="flex justify-between items-center mb-2">
                <CardTitle className="font-headline text-xl">
                Cart: <span className="text-primary font-bold">{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
                </CardTitle>
                {cartItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={onClearCart} className="text-xs h-8 text-destructive border-destructive hover:bg-destructive/10">
                    <Trash2 className="mr-1 h-3 w-3" /> Clear Cart
                </Button>
                )}
            </div>
            <div className="grid grid-cols-4 gap-2">
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" className="h-12 flex-col" onClick={onOpenSalesHistory}><ListChecks className="h-5 w-5 mb-1" /><span className="text-xs">History</span></Button></TooltipTrigger><TooltipContent>Sales History</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" className="h-12 flex-col" onClick={onOpenHeldSales}><Clock className="h-5 w-5 mb-1" /><span className="text-xs">Held Sales</span></Button></TooltipTrigger><TooltipContent>Held Sales</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" className="h-12 flex-col" onClick={onOpenCustomerManagement}><UserPlus className="h-5 w-5 mb-1" /><span className="text-xs">Customer</span></Button></TooltipTrigger><TooltipContent>Customer Management</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" className="h-12 flex-col" onClick={onOpenCalculator}><Calculator className="h-5 w-5 mb-1" /><span className="text-xs">Calculator</span></Button></TooltipTrigger><TooltipContent>Calculator</TooltipContent></Tooltip>
            </div>
            {selectedCustomer ? (
                <div className="p-2 mt-3 text-sm border rounded-md bg-muted/50">
                    <div className="flex items-center justify-between">
                        <div className="truncate"><span className="font-medium">Customer: </span><span className="text-primary font-semibold ml-1" title={selectedCustomer.name}>{selectedCustomer.name}</span></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClearCustomer}><X className="h-4 w-4" /></Button>
                    </div>
                    {selectedCustomer.status !== 'active' && (<Badge variant="destructive" className="mt-1 text-xs"><Ban className="h-3 w-3 mr-1" /> {selectedCustomer.status.toUpperCase()}</Badge>)}
                    
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {(selectedCustomer.outstandingCredit ?? 0) > 0.01 && (
                            <div className="flex items-center text-xs text-orange-600 dark:text-orange-400 font-bold">
                                <BadgeDollarSign className="h-3.5 w-3.5 mr-1" />Owed: {formatCurrency(selectedCustomer.outstandingCredit || 0, currencySymbol)}
                            </div>
                        )}
                        {(selectedCustomer.creditBalance ?? 0) > 0.01 && (
                            <div className="flex items-center text-xs text-green-600 dark:text-green-400 font-bold">
                                <PiggyBank className="h-3.5 w-3.5 mr-1" />Deposit: {formatCurrency(selectedCustomer.creditBalance || 0, currencySymbol)}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="manualCustomerName" className="text-xs font-medium">Walk-in Customer Name</Label>
                        <Input id="manualCustomerName" placeholder="Optional name" value={manualCustomerName} onChange={(e) => onManualCustomerNameChange(e.target.value)} disabled={isProcessingSale} className="h-9 text-sm"/>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="manualCustomerPhone" className="text-xs font-medium">Walk-in Phone (for Receipt)</Label>
                        <Input id="manualCustomerPhone" type="tel" placeholder="Optional phone" value={manualCustomerPhone} onChange={(e) => onManualCustomerPhoneChange(e.target.value)} disabled={isProcessingSale} className="h-9 text-sm"/>
                    </div>
                </div>
            )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden min-h-0">
            {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground flex-grow">
                    <ShoppingCartIcon className="h-20 w-20 mb-4 text-gray-300" /><p className="text-lg font-medium">Your cart is empty.</p><p className="text-sm">Add products from the left or scan a barcode.</p>
                </div>
            ) : (
                <ScrollArea className="flex-1 min-h-0 mb-3 -mx-4 px-4">
                    <ul className="divide-y divide-border">
                        {cartItems.map((item) => (
                            <li key={item.id} className="flex items-center py-3 space-x-3">
                                <div className="relative w-12 h-12 rounded overflow-hidden shrink-0"><Image src={item.imageUrl || defaultProductImageUrl} alt={item.name} fill sizes="48px" className="object-cover" data-ai-hint={item.dataAiHint || item.name.toLowerCase().split(' ').slice(0, 2).join(' ')}/></div>
                                <div className="flex-grow min-w-0"><p className="text-sm font-medium" title={item.name} style={{ overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>{item.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.salePrice, currencySymbol)}{item.sellingPrice !== item.salePrice && (<span className="line-through ml-1 text-red-500/70">{currencySymbol}{item.sellingPrice.toFixed(2)}</span>)}</p></div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}><MinusIconLucide className="h-3.5 w-3.5" /></Button>
                                    <Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(item.id, e.target.value)} className="w-10 h-7 text-center text-sm p-0" min="1" max={item.stock} step="1" aria-label={`Quantity for ${item.name}`}/>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><PlusIconLucide className="h-3.5 w-3.5" /></Button>
                                </div>
                                <p className="text-sm font-semibold w-20 text-right shrink-0">{formatCurrency(item.salePrice * item.quantity, currencySymbol)}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            )}
            <div className="border-t pt-3">
                <Accordion type="single" collapsible className="w-full mb-3 -mx-1" disabled={cartItems.length === 0}>
                    <AccordionItem value="item-1" className="border-none">
                        <AccordionTrigger className="text-sm py-2 px-1 hover:no-underline"><div className="flex items-center"><SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />Discount</div></AccordionTrigger>
                        <AccordionContent className="text-xs px-1 pb-2 space-y-4">
                           <RadioGroup defaultValue="percentage" value={localDiscountType} onValueChange={setLocalDiscountType} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="percentage" id="r-percentage" />
                                    <Label htmlFor="r-percentage">Percentage (%)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="fixed" id="r-fixed" />
                                    <Label htmlFor="r-fixed">Fixed Amount ({currencySymbol})</Label>
                                </div>
                           </RadioGroup>
                           <div className="flex gap-2">
                            <Input type="number" placeholder="e.g., 10" value={localDiscountValue} onChange={(e) => setLocalDiscountValue(e.target.value)} className="h-9"/>
                            <Button size="sm" className="h-9" onClick={handleApplyDiscountClick}>Apply</Button>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(subtotal, currencySymbol)}</span>
                    </div>
                     {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-red-600">
                            <button onClick={onClearDiscount} className="flex items-center gap-1 hover:underline">
                                <Tag className="h-3.5 w-3.5" />
                                Discount {discount.type === 'percentage' ? `(${discount.value}%)` : ''}
                                <X className="h-3.5 w-3.5" />
                            </button>
                            <span>-{formatCurrency(discountAmount, currencySymbol)}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center text-xl font-bold text-primary my-4">
                    <span>Grand Total</span>
                    <span>{formatCurrency(grandTotal, currencySymbol)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="w-full"><Button variant="outline" className="h-11 w-full" onClick={onInitiateCreditSale} disabled={cartItems.length === 0 || isProcessingSale || !selectedCustomer || selectedCustomer.status !== 'active'}><CreditCardIconLucide className="mr-1.5 h-4 w-4" /> Credit Sale</Button></div>
                        </TooltipTrigger>
                        {!selectedCustomer && cartItems.length > 0 && (<TooltipContent><p>Please select an active customer for a credit sale.</p></TooltipContent>)}
                        {selectedCustomer && selectedCustomer.status !== 'active' && cartItems.length > 0 && (<TooltipContent><p>Customer {selectedCustomer.name} is {selectedCustomer.status} and cannot make credit purchases.</p></TooltipContent>)}
                    </Tooltip>
                    <Button className="h-11 col-span-1 bg-green-600 hover:bg-green-700 text-white" onClick={onInitiatePayment} disabled={cartItems.length === 0 || isProcessingSale}>{isProcessingSale && (<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />)}<CheckIconLucide className="mr-1.5 h-4 w-4" /> Pay Now</Button>
                    <Button variant="outline" className="h-11" onClick={onInitiateHoldSale} disabled={cartItems.length === 0 || isProcessingSale}>{isProcessingSale && (<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />)}<PauseCircle className="mr-1.5 h-4 w-4" /> Hold Sale</Button>
                </div>
            </div>
            </CardContent>
        </Card>
    );
}
