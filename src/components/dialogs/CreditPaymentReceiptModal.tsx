'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { CreditPaymentReceiptInfo, SaleTransactionItem } from '@/lib/types';
import { format } from 'date-fns';
import { Printer, X, Download, FileText, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useSettings } from '@/contexts/settings-context';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { convertToDateSafely } from '@/lib/utils';
import { useFirestore } from '@/firebase';

const formatAmountWithCurrency = (amount: number | null | undefined, symbol: string) => {
    return `${symbol}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface CreditPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentInfo: CreditPaymentReceiptInfo | null;
  currencySymbol: string;
}


export function CreditPaymentReceiptModal({ isOpen, onClose, paymentInfo, currencySymbol }: CreditPaymentReceiptModalProps) {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeFormat, setActiveFormat] = useState<'small' | 'a4'>('small');
  const [isPrinting, setIsPrinting] = useState(false);
  const [localReprintCount, setLocalReprintCount] = useState(0);
  
  const enableExternalPrinter = settings?.enableExternalPrinter ?? true;

  const storeName = settings?.storeName || 'StoreLink Pro';
  const storeAddress = settings?.storeAddress;
  const storeContact = settings?.storePhone;
  const storeLogoUrl = settings?.storeLogoUrl;
  const invoiceLogoUrl = settings?.invoiceLogoUrl;
  const invoiceAccentColor = settings?.invoiceAccentColor || '#1A73E8';

  useEffect(() => {
    if (isOpen && paymentInfo) {
      setActiveFormat('small');
      setLocalReprintCount(paymentInfo.reprintCount || 0);
    }
  }, [isOpen, paymentInfo]);

  const {
    enableLogoOnReceipt,
    smallReceiptLogoSize,
    smallReceiptStoreNameBold,
    smallReceiptStoreAddressBold,
    enableLogoOnInvoice,
    invoiceWatermarkImageUrl,
    invoiceWatermarkLogoOpacity,
    invoiceWatermarkLogoPosition,
    invoiceWatermarkLogoSize,
    receiptFooterMessage,
  } = settings || {};

  const getReceiptTitle = (format: 'small' | 'a4') => {
    if (enableExternalPrinter) {
        return format === 'small' ? 'CREDIT PAYMENT RECEIPT' : 'CREDIT PAYMENT RECEIPT';
    }
    if (localReprintCount === 0) {
        return format === 'small' ? 'CREDIT PAYMENT RECEIPT (ORIGINAL)' : 'CREDIT PAYMENT RECEIPT (ORIGINAL)';
    }
    return format === 'small' ? `CREDIT PAYMENT RECEIPT (COPY ${localReprintCount})` : `CREDIT PAYMENT RECEIPT (COPY ${localReprintCount})`;
  };

  const printStyles = useMemo(() => `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Montserrat:wght@600;700;900&display=swap');
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-only { display: block !important; }
      .no-print { display: none !important; }

      /* Small Receipt Print Styles */
      @media print and (max-width: 300px) {
          @page { size: 76mm auto; margin: 4mm 2mm; }
          body { width: 72mm; margin: 0; font-family: 'Courier New', 'Lucida Console', monospace; font-size: 8.5pt; color: #000; line-height: 1.3; }
          .receipt-container { width: 100%; padding: 0; }
          .receipt-header { text-align: center; margin-bottom: 5px; }
          .receipt-header img { max-height: ${smallReceiptLogoSize || 30}px; max-width: 80%; margin: 0 auto 3px auto; display: block; object-fit: contain; }
          .receipt-header h2 { font-size: 10.5pt; margin: 0 0 1px 0; font-weight: ${smallReceiptStoreNameBold ? 'bold' : 'normal'}; text-transform: uppercase; }
          .receipt-header p { margin: 0; font-size: 7.5pt; font-weight: ${smallReceiptStoreAddressBold ? 'bold' : 'normal'}; }
          .receipt-title { font-size: 9.5pt; font-weight: bold; text-align: center; margin: 5px 0; border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 3px 0;}
          .receipt-info { margin-bottom: 5px; font-size: 7.5pt; padding: 3px 0; }
          .receipt-info p { margin: 1px 0; display: flex; justify-content: space-between; }
          .receipt-info span:first-child { text-align: left; }
          .receipt-info span:last-child { text-align: right; }
          .receipt-table { width: 100%; border-collapse: collapse; margin: 5px 0; }
          .receipt-table th, .receipt-table td { padding: 2px 0; font-size: 8pt; vertical-align: top;}
          .receipt-table th { border-bottom: 1px solid #555; font-weight: bold; text-align: left; }
          .receipt-table td { border-bottom: 1px dashed #ccc; }
          .receipt-table .item-name { width: 48%; padding-right: 3px; word-break: break-word; }
          .receipt-table .qty { text-align: center; width: 12%; }
          .receipt-table .price { text-align: right; width: 20%; padding-left: 3px;}
          .receipt-table .total { text-align: right; width: 20%; padding-left: 3px; font-weight: bold;}
          .summary-section { margin-top: 6px; border-top: 1px solid #555; padding-top: 4px; font-size: 8.5pt;}
          .summary-section div { display: flex; justify-content: space-between; padding: 0.5px 0;}
          .summary-section .total { font-weight: bold; font-size: 9.5pt; }
          .receipt-footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #555; text-align: center; font-size: 7pt; color: #333; }
      }

      /* A4 Invoice Print Styles */
      @media print {
        body { font-family: 'Lato', sans-serif; font-size: 10pt; color: #333; line-height: 1.5; }
        @page { size: A4; margin: 20mm; }
        .invoice-container { max-width: 190mm; margin: auto; padding: 0; border: none; box-shadow: none; position: relative; }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
        .invoice-header-left { flex-grow: 1; }
        .invoice-header img { max-height: 50px; max-width: 140px; object-fit: contain; margin-bottom: 12px; }
        .invoice-header h1 { font-family: 'Montserrat', sans-serif; font-size: 26pt; margin: 0; color: #222; font-weight: 700; }
        .invoice-header p { margin: 2px 0; font-size: 9.5pt; color: #555; }
        .invoice-title-main { font-family: 'Montserrat', sans-serif; font-size: 24pt; font-weight: 900; text-align: right; margin-left: 20px; line-height: 1.2; display: block; color: #1A73E8; }
        .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 10pt; }
        .invoice-meta > div { flex-basis: 48%; }
        .invoice-meta strong { display: inline-block; width: 120px; margin-right: 10px; color: #555; font-weight: 700; }
        .invoice-meta span { color: #333; font-weight: 600; }
        .invoice-summary { font-size: 10pt; background: #f9f9f9; border-radius: 8px; padding: 20px; border: 1px solid #eee; margin-top: 20px;}
        .invoice-summary h4 { font-family: 'Montserrat', sans-serif; font-size: 16pt; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #222; font-weight: 700;}
        .invoice-summary p { display: flex; justify-content: space-between; margin: 8px 0; line-height: 1.4; }
        .invoice-summary strong { flex-basis: 60%; text-align: left; color: #555; font-weight: 700; }
        .invoice-summary span { flex-basis: 40%; text-align: right; color: #333; font-weight: 600; }
        .invoice-summary .grand-total { font-size: 1.2em; border-top: 2px solid #bbb; padding-top: 10px; margin-top: 10px; }
        .invoice-summary .grand-total strong, .invoice-summary .grand-total span { font-size: 1.2em; color: #222;}
        .invoice-items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .invoice-items-table th, .invoice-items-table td { border-bottom: 1px solid #eee; padding: 10px 5px; text-align: left; }
        .invoice-items-table th { background-color: #f9f9f9; font-weight: 700; color: #555; text-transform: uppercase; font-size: 9pt;}
        .invoice-items-table td:nth-child(2), .invoice-items-table td:nth-child(3), .invoice-items-table td:nth-child(4) { text-align: right; }
        .invoice-footer { text-align: center; margin-top: 50px; padding-top: 10px; border-top: 1px solid #eee; font-size: 9pt; color: #777; }
        .invoice-watermark-logo { position: absolute; top: ${invoiceWatermarkLogoPosition === 'top' ? '5%' : '50%'}; left: 50%; transform: translate(-50%, ${invoiceWatermarkLogoPosition === 'top' ? '0' : '-50%'}); opacity: ${invoiceWatermarkLogoOpacity}; pointer-events: none; z-index: -1; }
        .invoice-watermark-logo img { display: block; width: ${invoiceWatermarkLogoSize}; height: auto; object-fit: contain; margin: auto; }
      }
    </style>`, [
      invoiceWatermarkLogoOpacity,
      invoiceWatermarkLogoPosition,
      invoiceWatermarkLogoSize,
      smallReceiptLogoSize,
      smallReceiptStoreNameBold,
      smallReceiptStoreAddressBold
  ]);

   const handlePrint = async (formatToPrint: 'small' | 'a4') => {
    if (!paymentInfo || isPrinting || !firestore) return;

    if (!enableExternalPrinter) {
      setIsPrinting(true);
      try {
        const saleRef = doc(firestore, "saleTransactions", paymentInfo.saleIdPaidAgainst);
        await updateDoc(saleRef, { reprintCount: increment(1) });
        setLocalReprintCount(prev => prev + 1);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Security Log Failed",
          description: "Could not update print count. Please try again.",
        });
        setIsPrinting(false);
        return;
      }
    }

    const printableAreaId = formatToPrint === 'small' ? 'printable-credit-receipt-small' : 'printable-credit-receipt-a4';
    const printableArea = document.getElementById(printableAreaId);

    if (!printableArea) {
      toast({
        title: "Print Failed",
        description: `Could not find the printable area ('${printableAreaId}').`,
        variant: "destructive",
      });
      setIsPrinting(false);
      return;
    }

    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
      toast({
        title: "Print Blocked",
        description: "Please allow pop-ups for this site to print.",
        variant: "destructive",
      });
      setIsPrinting(false);
      return;
    }

    const contentClone = printableArea.cloneNode(true) as HTMLElement;
    contentClone.querySelectorAll('.no-print').forEach(el => el.remove());

    const titleElementSmall = contentClone.querySelector('.receipt-title');
    const titleElementA4 = contentClone.querySelector('.invoice-title-main');
    if (titleElementSmall) titleElementSmall.textContent = getReceiptTitle('small');
    if (titleElementA4) titleElementA4.textContent = getReceiptTitle('a4');
    
    const documentContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - Credit Payment Receipt</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${printStyles}
        </head>
        <body>
          ${contentClone.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(documentContent);
    printWindow.document.close();

    printWindow.onload = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.error("Printing error:", e);
        toast({
          title: "Print Error",
          description: "An error occurred while trying to open the print dialog.",
          variant: "destructive",
        });
      } finally {
        setIsPrinting(false);
      }
    };
   };

   const handleDownloadPdf = () => {
       toast({
         title: "Preparing Download",
         description: "Your A4 Invoice will open in a print dialog. Please use the 'Save as PDF' or 'Print to PDF' option from your browser.",
         duration: 8000,
       });
       handlePrint('a4');
   };

  if (!isOpen || !paymentInfo) return null;
  if (isSettingsLoading) return <Dialog open={isOpen}><DialogContent><div className="p-6">Loading receipt settings...</div></DialogContent></Dialog>;


  const {
    customerName,
    saleIdPaidAgainst,
    originalSaleDate,
    items,
    paymentRecord,
    saleTotalAmount,
    saleAmountPreviouslyPaid,
    saleRemainingBalance,
    customerTotalOutstandingAfterPayment
  } = paymentInfo;

  const previousOutstanding = (customerTotalOutstandingAfterPayment || 0) + (paymentRecord.amountPaid || 0);

  const jsPaymentDate = convertToDateSafely(paymentRecord.paymentDate);
  const jsOriginalSaleDate = convertToDateSafely(originalSaleDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-3xl p-0 h-[85vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b no-print">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-gray-800">
             {activeFormat === 'small' ? 'Credit Payment Receipt' : 'Credit Payment Invoice'} Preview
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Payment on Sale ID: <span className="font-mono text-gray-700">{saleIdPaidAgainst?.substring(0, 12)}...</span> Review and choose format.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeFormat} onValueChange={(value) => setActiveFormat(value as 'small' | 'a4')} className="flex-grow flex flex-col min-h-0">
          <div className="px-6 py-3 border-b no-print">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="small" className="flex items-center gap-2">
                <Receipt className="mr-1 h-4 w-4" />
                Small Receipt
              </TabsTrigger>
              <TabsTrigger value="a4" className="flex items-center gap-2">
                <FileText className="mr-1 h-4 w-4" />
                A4 Invoice
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
            <TabsContent value="small" className="m-0 p-0">
              <div id="printable-credit-receipt-small" className="receipt-container w-full max-w-xs mx-auto text-sm bg-white text-black font-mono p-4 border rounded-md shadow-sm">
                  <header className="receipt-header">
                    {storeLogoUrl && (
                      <img 
                        src={storeLogoUrl} 
                        alt={storeName} 
                        style={{ maxHeight: '60px', maxWidth: '100%', marginBottom: '10px', objectFit: 'contain' }} 
                      />
                    )}
                    <h2 style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{storeName.toUpperCase()}</h2>
                    <p>{storeAddress}</p>
                    <p>Tel: {storeContact}</p>
                  </header>
                  <div className="receipt-title" style={{ textAlign: 'center', margin: '10px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0' }}>
                    {getReceiptTitle('small')}
                  </div>
                  <div className="receipt-info" style={{ fontSize: '0.9em', marginBottom: '10px' }}>
                    <p>Date: {jsPaymentDate ? format(jsPaymentDate, 'yyyy-MM-dd HH:mm') : 'N/A'}</p>
                    <p>Payment ID: {paymentInfo.id.substring(0, 8)}</p>
                    <p>Inv Ref: {saleIdPaidAgainst.substring(0, 8)}</p>
                    <p>Customer: {customerName}</p>
                  </div>
                  <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', paddingBottom: '5px', fontWeight: 'bold' }}>
                    Payment Method: {paymentRecord.paymentMethod}
                  </div>
                  <div className="summary-section" style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Amount Paid:</span>
                      <span style={{ fontWeight: 'bold' }}>{formatAmountWithCurrency(paymentRecord.amountPaid, currencySymbol)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Previous Bal:</span>
                      <span>{formatAmountWithCurrency(previousOutstanding, currencySymbol)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px double #000', paddingTop: '5px', marginTop: '5px' }}>
                      <span style={{ fontWeight: 'bold' }}>Remaining Bal:</span>
                      <span style={{ fontWeight: 'bold' }}>{formatAmountWithCurrency(customerTotalOutstandingAfterPayment, currencySymbol)}</span>
                    </div>
                  </div>
                  <footer style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8em', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    {settings?.receiptFooterMessage && <p>{settings.receiptFooterMessage}</p>}
                    <p>Powered by StoreLink Pro</p>
                  </footer>
              </div>
            </TabsContent>

            <TabsContent value="a4" className="m-0 p-0">
               <div id="printable-credit-receipt-a4" className="invoice-container bg-white text-gray-800 font-sans p-6 md:p-8 rounded-lg shadow-xl border border-gray-100 max-w-4xl mx-auto my-4">
                  <header className="invoice-header">
                    <div className="invoice-header-left">
                      {invoiceLogoUrl && <img src={invoiceLogoUrl} alt={storeName} className="invoice-logo" />}
                      <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{storeName}</h1>
                      <p>{storeAddress}</p>
                      <p>Tel: {storeContact}</p>
                    </div>
                    <div className="invoice-header-right" style={{ textAlign: 'right' }}>
                      <span className="invoice-title-main" style={{ color: invoiceAccentColor, fontSize: '32px', fontWeight: 'bold' }}>{getReceiptTitle('a4')}</span>
                      <p style={{ marginTop: '10px' }}><strong>Receipt No:</strong> {paymentInfo.id.substring(0, 12)}</p>
                      <p><strong>Date:</strong> {jsPaymentDate ? format(jsPaymentDate, 'MMMM dd, yyyy') : 'N/A'}</p>
                    </div>
                  </header>

                  <div className="invoice-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase', fontSize: '12px', color: '#999' }}>Received From</h3>
                      <p><strong>{customerName}</strong></p>
                      <p>Original Invoice: #{saleIdPaidAgainst.substring(0, 12)}</p>
                      <p>Sale Date: {jsOriginalSaleDate ? format(jsOriginalSaleDate, 'PP') : 'N/A'}</p>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase', fontSize: '12px', color: '#999' }}>Payment Details</h3>
                      <p><strong>Method:</strong> {paymentRecord.paymentMethod}</p>
                      {paymentRecord.notes && <p><strong>Notes:</strong> {paymentRecord.notes}</p>}
                    </div>
                  </div>

                  <div className="invoice-summary" style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Amount Paid:</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: invoiceAccentColor }}>{formatAmountWithCurrency(paymentRecord.amountPaid, currencySymbol)}</span>
                    </div>
                    <Separator style={{ margin: '10px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666' }}>
                      <span>Remaining Account Balance:</span>
                      <span>{formatAmountWithCurrency(customerTotalOutstandingAfterPayment, currencySymbol)}</span>
                    </div>
                  </div>

                  <footer className="invoice-footer" style={{ marginTop: '50px', textAlign: 'center', color: '#999', fontSize: '12px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <p>{storeName} • {storeAddress} • {storeContact}</p>
                    <p style={{ marginTop: '5px' }}>Official Receipt for credit payment settlement.</p>
                  </footer>
               </div>
            </TabsContent>
          </ScrollArea>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-3 p-6 border-t no-print">
            <DialogClose asChild>
              <Button variant="outline" onClick={onClose}>
                <X className="mr-2 h-4 w-4" /> Close
              </Button>
            </DialogClose>

            <Button onClick={() => handlePrint(activeFormat)} className="print-button" disabled={isPrinting}>
              <Printer className="mr-2 h-4 w-4" /> Print {activeFormat === 'small' ? 'Receipt' : 'Invoice'}
            </Button>

            {activeFormat === 'a4' && (
              <Button onClick={handleDownloadPdf} variant="outline" className="download-button" disabled={isPrinting}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            )}
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
