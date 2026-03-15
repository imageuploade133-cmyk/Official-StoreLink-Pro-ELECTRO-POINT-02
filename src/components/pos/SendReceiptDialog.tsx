'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, X, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SaleTransaction, Customer, Settings } from '@/lib/types';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';

interface SendReceiptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSendComplete: () => void;
  saleTransaction: SaleTransaction | null;
  customerInfo: { name: string; phone: string } | null;
  settings: Settings | null;
}

export function SendReceiptDialog({ isOpen, onOpenChange, onSendComplete, saleTransaction, customerInfo, settings }: SendReceiptDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && customerInfo) {
      setPhoneNumber(customerInfo.phone || '');
    }
  }, [isOpen, customerInfo]);

  const handleSend = async () => {
    if (!saleTransaction || !phoneNumber.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Phone number is required to send a receipt." });
      return;
    }
    if(settings?.enableWhatsapp === false) {
      toast({ variant: "destructive", title: "WhatsApp Disabled", description: "WhatsApp messaging is disabled in settings." });
      return;
    }

    setIsSending(true);

    const formattedPhone = formatPhoneNumberForWhatsapp(phoneNumber, settings?.countryCode);
    if (!formattedPhone) {
        toast({ variant: "destructive", title: "Invalid Phone Number" });
        setIsSending(false);
        return;
    }

    try {
      await sendWhatsAppReceipt({
        eventType: 'sale_paid',
        phone: formattedPhone,
        customerName: customerInfo?.name || 'Valued Customer',
        storeName: settings?.storeName || 'Your Store',
        currencySymbol: settings?.currency || '$',
        heading: settings?.whatsappSaleReceiptHeading,
        greeting: settings?.whatsappGreeting,
        footer: settings?.whatsappReceiptFooter,
        saleId: saleTransaction.id,
        items: saleTransaction.items.map(i => ({ name: i.productName, qty: i.quantity, price: i.totalPrice })),
        subtotal: saleTransaction.subtotal,
        discountAmount: saleTransaction.discountAmountCalculated,
        total: saleTransaction.grandTotal,
        amountPaid: saleTransaction.paymentDetails?.amountTendered,
        changeGiven: saleTransaction.paymentDetails?.changeGiven,
        paymentMethod: saleTransaction.paymentMethod,
      });

      toast({ title: "Receipt Sent", description: "The WhatsApp receipt has been sent successfully." });
      handleClose();

    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Send", description: error.message || "An unknown error occurred." });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onSendComplete();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-600"/> Send WhatsApp Receipt</DialogTitle>
          <DialogDescription>
            Confirm the phone number to send a receipt to {customerInfo?.name || 'the customer'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="receipt-phone">Phone Number</Label>
          <Input 
            id="receipt-phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            disabled={isSending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            <X className="mr-2 h-4 w-4"/> Skip
          </Button>
          <Button onClick={handleSend} disabled={isSending || !phoneNumber.trim()}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
