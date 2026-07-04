
'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { 
  User, 
  MapPin, 
  CreditCard, 
  Clock, 
  Package, 
  Mail, 
  Phone, 
  MessageSquare,
  Calendar,
  Landmark,
  CheckCircle2,
  X,
  ArchiveX,
  Printer,
  Loader2,
  Store,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import type { Order, Product, OrderStatus } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { updateOrderStatusAction, sendOrderEmailsAction, sendWhatsAppOrderAlertAction } from '@/app/actions/orders';
import { useToast } from '@/hooks/use-toast';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  currencySymbol: string;
  productMap: Map<string, Product>;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export function OrderDetailsModal({
  isOpen,
  onOpenChange,
  order,
  currencySymbol,
  productMap,
  onUpdateStatus
}: OrderDetailsModalProps) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isPrinting, setIsPrinting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<OrderStatus | null>(null);
  const [isResendingWhatsApp, setIsResendingWhatsApp] = useState(false);
  
  const createdAt = convertToDateSafely(order.createdAt);
  
  const isAwaitingPayment = useMemo(() => {
    return order.status === 'pending' && (
      order.paymentMethod === 'Bank Transfer' || 
      order.paymentMethod === 'manual-bank-transfer' ||
      order.paymentMethod === 'Pay on Delivery'
    );
  }, [order.status, order.paymentMethod]);

  const isPayOnDelivery = order.paymentMethod === 'Pay on Delivery';

  const itemsWithAvailability = useMemo(() => {
    return order.items.map(item => {
      const product = productMap.get(item.productId);
      return {
        ...item,
        exists: !!product,
        productName: item.productName || product?.name || 'Unknown Product',
        isAvailable: product ? product.isVisibleInPOS !== false : false,
        selectedOptions: item.selectedOptions || null,
        variantId: item.variantId || null,
      };
    });
  }, [order.items, productMap]);

  const hasUnavailableItems = useMemo(() => {
    return itemsWithAvailability.some(item => !item.exists);
  }, [itemsWithAvailability]);

  const statusActions: { label: string; status: OrderStatus; variant: "default" | "outline" | "secondary" | "destructive" }[] = [
    { label: 'Process Order', status: 'processing', variant: 'default' },
    { label: 'Mark as Shipped', status: 'shipped', variant: 'default' },
    { label: 'Mark as Delivered', status: 'delivered', variant: 'secondary' },
    { label: 'Cancel Order', status: 'cancelled', variant: 'destructive' },
  ];

  const handleUpdateStatusInternal = async (status: OrderStatus) => {
    setUpdatingStatus(status);
    try {
      await onUpdateStatus(order.id, status);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const printableArea = document.getElementById('printable-order-invoice');
    if (!printableArea) {
        setIsPrinting(false);
        return;
    }

    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        setIsPrinting(false);
        return;
    }

    const styles = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;700;900&display=swap');
            body { font-family: 'Public Sans', sans-serif; color: #111; line-height: 1.5; margin: 0; padding: 0; }
            .invoice-container { max-width: 190mm; margin: auto; padding: 20mm; background: white; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .header-left img { max-height: 60px; margin-bottom: 10px; }
            .header-left h1 { font-size: 24px; margin: 0; color: ${settings?.invoiceAccentColor || '#ec5b13'}; }
            .header-right { text-align: right; }
            .header-right h2 { font-size: 32px; font-weight: 900; margin: 0; color: #ddd; }
            .meta-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .meta-item h3 { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9ca3af; margin-bottom: 5px; letter-spacing: 0.1em; }
            .meta-item p { font-size: 14px; font-weight: 700; margin: 0; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .table th { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; text-align: left; color: #6b7280; }
            .table td { border: 1px solid #e5e7eb; padding: 12px; font-size: 13px; }
            .table td.right { text-align: right; }
            .table td.center { text-align: center; }
            .summary { display: flex; justify-content: flex-end; }
            .summary-box { width: 250px; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .grand-total { border-top: 2px solid #111; padding-top: 15px; margin-top: 10px; font-weight: 900; font-size: 20px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #9ca3af; }
            @media print { @page { size: A4; margin: 0; } .no-print { display: none !important; } }
        </style>
    `;

    printWindow.document.write('<html><head><title>Invoice #' + order.id.substring(0, 8) + '</title>');
    printWindow.document.write(styles);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printableArea.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();

    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        setIsPrinting(false);
    };
  };

    const handleResendWhatsApp = async () => {
      setIsResendingWhatsApp(true);
      try {
        const result = await sendWhatsAppOrderAlertAction(order.id, order.store_id || 'global');
        if (result.success) {
          toast({ title: "WhatsApp Sent", description: "Order alert has been resent successfully." });
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: "Failed to send WhatsApp", description: error.message });
      } finally {
        setIsResendingWhatsApp(false);
      }
    };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[98vw] sm:w-[95vw] md:w-full h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden rounded-t-2xl sm:rounded-xl">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b bg-background sticky top-0 z-50">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1 text-left">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">Order Details</DialogTitle>
              <DialogDescription className="font-mono text-[10px] sm:text-xs text-primary uppercase">
                ID: #{order.id}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end w-full sm:w-auto">
              <Badge variant="outline" className={cn(
                "text-[10px] sm:text-xs font-bold uppercase",
                order.fulfillmentType === 'delivery'
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
              )}>
                {order.fulfillmentType === 'delivery' ? <><Truck className="mr-1 h-3 w-3" /> Delivery</> : <><Store className="mr-1 h-3 w-3" /> Pickup</>}
              </Badge>
              {(() => {
                const s = order.paymentStatus || (order.isPaid ? 'PAID' : 'UNPAID');
                switch (s) {
                  case 'PAID':
                    return <Badge className="bg-green-600 text-white border-transparent uppercase text-[10px] font-bold">PAID</Badge>;
                  case 'UNPAID':
                    return <Badge variant="destructive" className="uppercase text-[10px] font-bold">UNPAID</Badge>;
                  case 'PENDING':
                    return <Badge className="bg-yellow-500 text-white border-transparent uppercase text-[10px] font-bold">PENDING</Badge>;
                  case 'REFUNDED':
                    return <Badge className="bg-gray-500 text-white border-transparent uppercase text-[10px] font-bold">REFUNDED</Badge>;
                  default:
                    return <Badge variant="outline" className="uppercase text-[10px] font-bold">{s}</Badge>;
                }
              })()}
              <Badge className={cn(
                  "text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 capitalize",
                  order.status === 'delivered' ? "bg-green-100 text-green-700" :
                  order.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
              )}>
                {order.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Urgent Banners */}
            {isAwaitingPayment && (
                <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl flex items-start gap-4 text-orange-800 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-orange-500 p-2 rounded-full text-white">
                        {isPayOnDelivery ? <Truck className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">{isPayOnDelivery ? 'Pay on Delivery' : 'Awaiting Payment'}</h4>
                        <p className="text-sm mt-1 leading-relaxed">
                            {isPayOnDelivery 
                                ? "This order will be paid for upon delivery. Ensure the courier is prepared to collect payment."
                                : `This customer chose Bank Transfer. Please verify the funds in your account using reference ${order.paymentReference} before processing.`}
                        </p>
                    </div>
                </div>
            )}

            {hasUnavailableItems && (
                <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl flex items-start gap-4 text-red-800 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-red-500 p-2 rounded-full text-white">
                        <ArchiveX className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">Inventory Issue Detected</h4>
                        <p className="text-sm mt-1 leading-relaxed">
                            One or more items in this order are no longer available in your inventory catalog. Please review the item list below.
                        </p>
                    </div>
                </div>
            )}

            {/* Top Grid: Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <Card className="bg-muted/20 border-none shadow-none">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                    <User className="h-3.5 w-3.5" /> Customer Identity
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-lg font-black text-gray-900 leading-none">{order.guestInfo?.name || 'Registered Customer'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Mail className="h-3 w-3" /> {order.guestInfo?.email || 'Account-based'}
                      </div>
                      {order.guestInfo?.phone && (
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {order.guestInfo.phone}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[10px] text-[#25D366] hover:text-[#128C7E] hover:bg-[#25D366]/10 gap-1 font-bold"
                            onClick={() => {
                              const phone = order.guestInfo.phone.replace(/\D/g, '');
                              window.open(`https://wa.me/${phone.startsWith('0') ? '234' + phone.substring(1) : phone}`, '_blank');
                            }}
                          >
                            <MessageSquare className="h-3 w-3" /> Chat on WhatsApp
                          </Button>
                        </div>
                      )}
                    </div>
                    <Separator className="bg-gray-200" />
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {order.fulfillmentType === 'pickup' ? 'Store Pickup' : 'Delivery Route'}
                      </p>
                      <div className="flex items-start gap-2 text-xs leading-relaxed font-bold">
                        {order.fulfillmentType === 'pickup' ? (
                          <Store className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        )}
                        <p>
                          {order.fulfillmentType === 'pickup' 
                            ? 'Customer will pick up from store.' 
                            : (order.guestInfo?.address || 'Address provided in account profile')}
                        </p>
                      </div>
                      {order.deliveryLocationId && (
                        <p className="text-[10px] text-muted-foreground">
                          Location ID: {order.deliveryLocationId}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment & Status */}
              <Card className="bg-muted/20 border-none shadow-none">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                    <CreditCard className="h-3.5 w-3.5" /> Logistics & Payment
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Method</p>
                        <p className="text-sm font-bold">{order.paymentMethod}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reference</p>
                        <p className="text-sm font-mono font-bold text-primary">{order.paymentReference || 'N/A'}</p>
                      </div>
                    </div>
                    {order.selectedBankAccount && (
                      <div className="p-3 bg-white border rounded-xl flex items-center gap-3 shadow-sm">
                        <Landmark className="h-5 w-5 text-primary" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Target Bank</p>
                          <p className="text-xs font-bold truncate">{order.selectedBankAccount.bankName}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground pt-2">
                      <Calendar className="h-3.5 w-3.5" />
                      Placed: {createdAt ? format(createdAt, 'PP p') : 'N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                <Package className="h-4 w-4" /> Fulfillment List
              </h3>
              <div className="border rounded-xl overflow-x-auto bg-white shadow-sm min-w-full">
                <table className="w-full text-sm min-w-[600px] sm:min-w-0">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-black uppercase text-[10px] text-slate-500 tracking-widest">Product</th>
                      <th className="px-4 py-3 text-center font-black uppercase text-[10px] text-slate-500 tracking-widest">Qty</th>
                      <th className="px-4 py-3 text-right font-black uppercase text-[10px] text-slate-500 tracking-widest">Price</th>
                      <th className="px-4 py-3 text-right font-black uppercase text-[10px] text-slate-500 tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemsWithAvailability.map((item, idx) => (
                      <tr key={idx} className={cn("hover:bg-muted/5", !item.exists && "bg-red-50/30")}>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className={cn("font-bold text-gray-900", !item.exists && "line-through text-gray-400")}>
                                {item.productName}
                            </span>
                            {item.selectedOptions && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(item.selectedOptions).map(([key, val]) => (
                                  <Badge key={key} variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/5 text-primary border-primary/20">
                                    {key}: {val}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {!item.exists && (
                                <Badge variant="destructive" className="w-fit mt-1 text-[9px] h-4 uppercase font-black">Order not Available</Badge>
                            )}
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {item.productId.substring(0, 8)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold">{item.quantity}</td>
                        <td className="px-4 py-4 text-right font-medium text-slate-500">{formatCurrency(item.price, currencySymbol)}</td>
                        <td className="px-4 py-4 text-right font-black text-gray-900">{formatCurrency(item.price * item.quantity, currencySymbol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-full md:w-72 space-y-3 bg-muted/10 p-6 rounded-2xl border border-dashed border-gray-300">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold text-foreground">{formatCurrency(order.totalAmount - (order.deliveryPrice || 0), currencySymbol)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span className="font-medium">{order.fulfillmentType === 'pickup' ? 'Pickup Fee' : 'Delivery Price'}</span>
                  <span className="font-bold text-foreground">{formatCurrency(order.deliveryPrice || 0, currencySymbol)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-end pt-2">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Grand Total</span>
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(order.totalAmount, currencySymbol)}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Hidden Printable Invoice */}
        <div id="printable-order-invoice" className="hidden">
            <div className="invoice-container">
                <div className="header">
                    <div className="header-left">
                        {settings?.invoiceLogoUrl && <img src={settings.invoiceLogoUrl} alt={settings?.storeName} />}
                        <h1>{settings?.storeName || 'StoreLink Pro'}</h1>
                        <p style={{ fontSize: '12px', color: '#666' }}>{settings?.storeAddress}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>{settings?.storePhone}</p>
                    </div>
                    <div className="header-right">
                        <h2>INVOICE</h2>
                        <p><strong>Order ID:</strong> #{order.id.substring(0, 12).toUpperCase()}</p>
                        <p><strong>Date:</strong> {createdAt ? format(createdAt, 'MMMM dd, yyyy') : 'N/A'}</p>
                    </div>
                </div>

                <div className="meta-section">
                    <div className="meta-item">
                        <h3>Customer Details</h3>
                        <p>{order.guestInfo?.name || 'Registered Customer'}</p>
                        <p style={{ fontWeight: 'normal', fontSize: '12px' }}>{order.guestInfo?.email || 'Authenticated User'}</p>
                        <p style={{ fontWeight: 'normal', fontSize: '12px' }}>{order.guestInfo?.phone || ''}</p>
                    </div>
                    <div className="meta-item" style={{ textAlign: 'right' }}>
                        <h3>{order.fulfillmentType === 'pickup' ? 'Fulfillment Type' : 'Delivery Address'}</h3>
                        <p style={{ fontWeight: 'normal', whiteSpace: 'pre-wrap', maxWidth: '300px' }}>
                            {order.fulfillmentType === 'pickup' 
                                ? 'Store Pickup' 
                                : (order.guestInfo?.address || 'Provided in account profile')}
                        </p>
                    </div>
                </div>

                <table className="table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="center">Qty</th>
                            <th className="right">Unit Price</th>
                            <th className="right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, idx) => {
                            const p = productMap.get(item.productId);
                            const options = item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
                            return (
                                <tr key={idx}>
                                    <td>
                                        <div>{item.productName || p?.name || 'Unknown Product'}</div>
                                        {options && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{options}</div>}
                                    </td>
                                    <td className="center">{item.quantity}</td>
                                    <td className="right">{formatCurrency(item.price, currencySymbol)}</td>
                                    <td className="right">{formatCurrency(item.price * item.quantity, currencySymbol)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="summary">
                    <div className="summary-box">
                        <div className="summary-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(order.totalAmount - (order.deliveryPrice || 0), currencySymbol)}</span>
                        </div>
                        <div className="summary-row">
                            <span>{order.fulfillmentType === 'pickup' ? 'Pickup Fee' : 'Delivery Price'}:</span>
                            <span>{formatCurrency(order.deliveryPrice || 0, currencySymbol)}</span>
                        </div>
                        <div className="summary-row grand-total">
                            <span>Grand Total:</span>
                            <span>{formatCurrency(order.totalAmount, currencySymbol)}</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '40px' }}>
                    <h3 style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '5px' }}>Payment Metadata</h3>
                    <p style={{ fontSize: '12px' }}>Method: <strong>{order.paymentMethod}</strong></p>
                    {order.paymentReference && <p style={{ fontSize: '12px' }}>Reference: <strong>{order.paymentReference}</strong></p>}
                </div>

                <div className="footer">
                    <p>Thank you for shopping with {settings?.storeName || 'us'}!</p>
                    <p>All items are subject to our terms and return policy.</p>
                </div>
            </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-background shadow-lg">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {statusActions
              .filter(action => action.status !== order.status)
              .map((action) => (
                <Button 
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => handleUpdateStatusInternal(action.status)}
                  loading={updatingStatus === action.status}
                  disabled={isPrinting || (!!updatingStatus && updatingStatus !== action.status)}
                  className="text-[10px] sm:text-xs h-9 px-3 sm:px-4 font-bold flex-1 sm:flex-none"
                >
                  {action.label}
                </Button>
              ))
            }
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <Button 
                variant="outline" 
                onClick={handleResendWhatsApp} 
                loading={isResendingWhatsApp}
                disabled={isPrinting || !!updatingStatus}
                className="h-9 px-3 sm:px-4 font-bold border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 text-[10px] sm:text-xs flex-1 sm:flex-none"
            >
                {!isResendingWhatsApp && <MessageSquare className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                Resend Alert
            </Button>
            <Button 
                variant="outline" 
                onClick={handlePrint} 
                loading={isPrinting}
                disabled={!!updatingStatus}
                className="h-9 px-3 sm:px-4 font-bold border-primary text-primary hover:bg-primary/5 text-[10px] sm:text-xs flex-1 sm:flex-none"
            >
                {!isPrinting && <Printer className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4" />}
                Print Invoice
            </Button>
            <DialogClose asChild>
                <Button variant="outline" className="h-9 px-4 sm:px-6 font-bold text-[10px] sm:text-xs flex-1 sm:flex-none" disabled={isPrinting || !!updatingStatus}>Close</Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
