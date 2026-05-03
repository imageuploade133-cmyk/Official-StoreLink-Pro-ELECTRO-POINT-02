'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CreditPaymentReceiptInfo } from '@/lib/types';
import { format } from 'date-fns';
import { Printer, X, Download, FileText, Receipt, CheckCircle2, User, Landmark, CreditCard, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { convertToDateSafely, cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { Separator } from '../ui/separator';

const formatAmountWithCurrency = (amount: number | null | undefined, symbol: string) => {
    return `${symbol}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface CreditPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentInfo: CreditPaymentReceiptInfo | null;
  currencySymbol: string;
}

const DEFAULT_STORE_NAME = 'StoreLink Pro';

export function CreditPaymentReceiptModal({ isOpen, onClose, paymentInfo, currencySymbol }: CreditPaymentReceiptModalProps) {
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeFormat, setActiveFormat] = useState<'small' | 'a4'>('small');
  const [isPrinting, setIsPrinting] = useState(false);
  const [localReprintCount, setLocalReprintCount] = useState(0);
  
  const enableExternalPrinter = settings?.enableExternalPrinter ?? true;

  const storeName = settings?.storeName || DEFAULT_STORE_NAME;
  const storeAddress = settings?.storeAddress;
  const storeContact = settings?.storePhone; 
  const invoiceLogoUrl = settings?.invoiceLogoUrl;
  const storeLogoUrl = settings?.storeLogoUrl;
  const invoiceAccentColor = settings?.invoiceAccentColor || '#ec5b13';
  const invoiceLogoHeight = settings?.invoiceLogoHeight || 50;
  const terminalLogoHeight = settings?.terminalLogoHeight || 60;

  useEffect(() => {
    if (isOpen && paymentInfo) {
      setActiveFormat('small');
      setLocalReprintCount(paymentInfo.reprintCount || 0);
    }
  }, [isOpen, paymentInfo]);

  const getReceiptTitle = useCallback((format: 'small' | 'a4') => {
    return format === 'small' ? 'CREDIT PAYMENT RECEIPT' : 'PAYMENT RECEIPT';
  }, []);

  const previousOutstanding = useMemo(() => {
    if (!paymentInfo) return 0;
    return (paymentInfo.customerTotalOutstandingAfterPayment || 0) + (paymentInfo.paymentRecord?.amountPaid || 0);
  }, [paymentInfo]);

  const printStyles = useMemo(() => `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
      
      body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        margin: 0;
        padding: 0;
        background-color: white;
      }

      .brand-color { color: ${invoiceAccentColor}; }
      .brand-bg { background-color: ${invoiceAccentColor}; }
      
      /* Real Terminal Styling */
      .terminal-receipt {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
        padding: 20px 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: black;
        line-height: 1.2;
      }

      .terminal-header { text-align: center; margin-bottom: 15px; }
      .terminal-header img { max-height: ${terminalLogoHeight}px; max-width: 80%; margin: 0 auto 10px auto; display: block; object-fit: contain; }
      .terminal-header h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
      .terminal-header p { font-size: 10px; margin: 0; }

      .divider-dashed { border-top: 1px dashed black; margin: 8px 0; }
      .divider-double { border-top: 3px double black; margin: 8px 0; }

      .payment-box { border: 1px solid black; padding: 10px; text-align: center; margin: 15px 0; }
      .amount-large { font-size: 24px; font-weight: 700; margin-top: 5px; display: block; }

      /* A4 Invoice Styling */
      .invoice-container {
        max-width: 190mm;
        margin: auto;
        padding: 20mm;
        position: relative;
        background: white;
        font-family: 'Public Sans', sans-serif;
      }

      .invoice-logo { max-height: ${invoiceLogoHeight}px; max-width: 140px; object-fit: contain; margin-bottom: 12px; }

      .paid-watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 12rem;
        font-weight: 900;
        color: ${invoiceAccentColor};
        opacity: 0.03;
        pointer-events: none;
        z-index: 0;
      }

      .status-banner {
        background-color: rgba(236, 91, 19, 0.05);
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(236, 91, 19, 0.1);
        margin: -20mm -20mm 20mm -20mm;
      }

      @media print {
        @page { size: auto; margin: 0; }
        .no-print { display: none !important; }
      }
    </style>`, [invoiceAccentColor, invoiceLogoHeight, terminalLogoHeight]);

   const handlePrint = async (formatToPrint: 'small' | 'a4') => {
    if (!paymentInfo || isPrinting || !firestore) return;

    if (!enableExternalPrinter) {
      setIsPrinting(true);
      try {
        const saleRef = doc(firestore, "saleTransactions", paymentInfo.saleIdPaidAgainst);
        await updateDoc(saleRef, { reprintCount: increment(1) });
        setLocalReprintCount(prev => prev + 1);
      } catch (error) {
        console.error("Print log failed", error);
      }
    }

    const printableAreaId = formatToPrint === 'small' ? 'printable-credit-receipt-small' : 'printable-credit-receipt-a4';
    const printableArea = document.getElementById(printableAreaId);

    if (!printableArea) return;

    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) {
        toast({ variant: 'destructive', title: 'Pop-up Blocked', description: 'Please allow pop-ups to print receipts.' });
        return;
    }

    const contentClone = printableArea.cloneNode(true) as HTMLElement;
    contentClone.querySelectorAll('.no-print').forEach(el => el.remove());

    const documentContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Print - Credit Payment Receipt</title>
          <meta charset="UTF-8">
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
      printWindow.focus();
      printWindow.print();
      setIsPrinting(false);
    };
   };

  if (!isOpen || !paymentInfo) return null;
  if (isSettingsLoading) return <Dialog open={isOpen}><DialogContent><div className="p-6">Loading settings...</div></DialogContent></Dialog>;

  const {
    customerName,
    saleIdPaidAgainst,
    paymentRecord,
    customerTotalOutstandingAfterPayment
  } = paymentInfo;
  
  const jsPaymentDate = convertToDateSafely(paymentRecord.paymentDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] p-0 h-[90vh] sm:h-[85vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b no-print">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-gray-800">
             Payment Receipt Preview
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Payment ID: <span className="font-mono break-all">{paymentInfo.id}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeFormat} onValueChange={(value) => setActiveFormat(value as 'small' | 'a4')} className="flex-grow flex flex-col min-h-0">
          <div className="px-4 sm:px-6 py-2 sm:py-3 border-b no-print">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="small" className="flex items-center gap-2 text-xs sm:text-sm">
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4" /> Terminal Receipt
              </TabsTrigger>
              <TabsTrigger value="a4" className="flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" /> A4 Invoice
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-2 sm:p-4 md:p-8 bg-muted/30">
            <TabsContent value="small" className="m-0 p-0">
              <div id="printable-credit-receipt-small" className="terminal-receipt bg-white mx-auto shadow-xl rounded-sm scale-90 sm:scale-100 origin-top">
                <header className="terminal-header">
                  {storeLogoUrl && (
                    <img 
                      src={storeLogoUrl} 
                      alt={storeName} 
                      style={{ maxHeight: `${terminalLogoHeight}px`, maxWidth: '100%', marginBottom: '10px', objectFit: 'contain' }} 
                    />
                  )}
                  <h1>{storeName.toUpperCase()}</h1>
                  {storeAddress && <p>{storeAddress}</p>}
                  {storeContact && <p>Tel: {storeContact}</p>}
                </header>

                <div className="divider-double"></div>
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{getReceiptTitle('small')}</div>
                <div className="divider-dashed"></div>

                <div className="space-y-1" style={{ fontSize: '10px' }}>
                  <div className="flex justify-between">
                    <span>DATE: {jsPaymentDate ? format(jsPaymentDate, 'yyyy-MM-dd') : 'N/A'}</span>
                    <span>TIME: {jsPaymentDate ? format(jsPaymentDate, 'HH:mm:ss') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RCPT: #{paymentInfo.id.substring(0, 8)}</span>
                    <span>INV: #{saleIdPaidAgainst.substring(0, 8)}</span>
                  </div>
                </div>

                <div className="divider-dashed"></div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>CUSTOMER:</span>
                    <span style={{ fontWeight: 'bold' }}>{customerName.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>METHOD:</span>
                    <span style={{ fontWeight: 'bold' }}>{paymentRecord.paymentMethod.toUpperCase()}</span>
                  </div>
                </div>

                <div className="payment-box">
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>AMOUNT PAID</span>
                    <span className="amount-large">{formatAmountWithCurrency(paymentRecord.amountPaid, currencySymbol)}</span>
                </div>

                <div className="space-y-1" style={{ fontSize: '10px' }}>
                  <div className="flex justify-between">
                    <span>PREVIOUS BAL:</span>
                    <span>{formatAmountWithCurrency(previousOutstanding, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between" style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '5px' }}>
                    <span>NEW BALANCE:</span>
                    <span>{formatAmountWithCurrency(customerTotalOutstandingAfterPayment, currencySymbol)}</span>
                  </div>
                </div>

                <div className="divider-double"></div>

                <footer style={{ textAlign: 'center', marginTop: '10px' }}>
                  {settings?.receiptFooterMessage && <p style={{ fontWeight: 'bold' }}>{settings.receiptFooterMessage.toUpperCase()}</p>}
                  <p style={{ fontSize: '8px', marginTop: '5px' }}>POWERED BY StoreLink Pro</p>
                </footer>
              </div>
            </TabsContent>

            <TabsContent value="a4" className="m-0 p-0">
               <div id="printable-credit-receipt-a4" className="invoice-container shadow-2xl rounded-xl overflow-hidden max-w-4xl mx-auto my-4">
                 <div className="paid-watermark">RECEIPT</div>
                 
                 <div className="status-banner no-print" style={{backgroundColor: 'rgba(236, 91, 19, 0.05)'}}>
                    <div className="flex items-center gap-2 brand-color font-bold tracking-wider text-sm">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>PAYMENT RECEIVED</span>
                    </div>
                    <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                        Ref: #{paymentInfo.id.substring(0, 12)}
                    </div>
                 </div>

                 <div className="p-10 space-y-10 relative z-10">
                    <div className="flex flex-wrap justify-between items-start gap-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                                {getReceiptTitle('a4')} <span className="brand-color">#PAY-{jsPaymentDate ? format(jsPaymentDate, 'yyyy') : '2024'}-{paymentInfo.id.substring(0, 4).toUpperCase()}</span>
                            </h1>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Date</p>
                                <p className="text-gray-700 font-bold">{jsPaymentDate ? format(jsPaymentDate, 'MMMM dd, yyyy') : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                            {invoiceLogoUrl ? (
                                <img src={invoiceLogoUrl} alt={storeName} style={{ maxHeight: `${invoiceLogoHeight}px`, width: 'auto', objectFit: 'contain' }} className="mb-2" />
                            ) : (
                                <div className="brand-bg px-6 py-2 rounded-full text-white font-black text-lg tracking-widest shadow-md">
                                    RECEIVED
                                </div>
                            )}
                            <p className="text-gray-500 text-sm italic">Official Payment Confirmation</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-gray-100 pt-10">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black brand-color uppercase tracking-widest">Received From</h3>
                            <div className="text-gray-800 space-y-1">
                                <p className="font-black text-xl">{customerName}</p>
                                <p className="text-sm text-gray-500">Invoice Ref: #{saleIdPaidAgainst.substring(0, 12)}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xs font-black brand-color uppercase tracking-widest">Business Details</h3>
                            <div className="text-gray-800 space-y-1">
                                <p className="font-black text-xl">{storeName}</p>
                                <p className="text-sm text-gray-500">{storeAddress}</p>
                                <p className="text-sm text-gray-500">{storeContact}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-2xl border border-gray-100 mb-12">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Payment Summary</h4>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-sm text-gray-500 mb-1 font-medium">Payment Method</p>
                                <p className="font-black text-lg text-gray-900">{paymentRecord.paymentMethod}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 mb-1 font-medium">Net Received</p>
                                <p className="text-4xl font-black brand-color tracking-tighter">
                                    {formatAmountWithCurrency(paymentRecord.amountPaid, currencySymbol)}
                                </p>
                            </div>
                        </div>
                        {paymentRecord.notes && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Notes</p>
                                <p className="text-sm text-gray-600 italic">"{paymentRecord.notes}"</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end">
                        <div className="w-full md:w-80 space-y-4">
                            <div className="flex justify-between items-center text-gray-600 text-sm">
                                <span className="font-medium">Previous Balance</span>
                                <span className="font-bold">{formatAmountWithCurrency(previousOutstanding, currencySymbol)}</span>
                            </div>
                            <div className="flex justify-between items-center text-green-600 text-sm">
                                <span className="font-medium">Amount Credited</span>
                                <span className="font-bold">-{formatAmountWithCurrency(paymentRecord.amountPaid, currencySymbol)}</span>
                            </div>
                            <div className="pt-4 border-t-2 border-gray-100">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black brand-color uppercase tracking-widest">New Balance</span>
                                        <span className="text-xs text-gray-400">Total Owed</span>
                                    </div>
                                    <span className="text-3xl font-black text-gray-900 tracking-tighter">
                                        {formatAmountWithCurrency(customerTotalOutstandingAfterPayment, currencySymbol)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                     
                    <footer className="pt-10 border-t border-gray-100 text-center space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{storeName}</p>
                        <p className="text-[10px] text-gray-400">Payment Processed via StoreLink Pro POS</p>
                    </footer>
                 </div>
               </div>
            </TabsContent>
          </ScrollArea>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t no-print bg-white">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                <X className="mr-2 h-4 w-4" /> Close
              </Button>
            </DialogClose>

            <Button onClick={() => handlePrint(activeFormat)} className="brand-bg hover:brightness-110 w-full sm:w-auto" disabled={isPrinting}>
              <Printer className="mr-2 h-4 w-4" /> Print {activeFormat === 'small' ? 'Receipt' : 'Invoice'}
            </Button>

            {activeFormat === 'a4' && (
              <Button onClick={() => handlePrint('a4')} variant="secondary" className="w-full sm:w-auto" disabled={isPrinting}>
                <Download className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            )}
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
