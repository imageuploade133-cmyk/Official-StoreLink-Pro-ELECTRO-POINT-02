
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
import type { SaleTransaction, StaffMember } from '@/lib/types';
import { format } from 'date-fns';
import { Printer, X, Download, FileText, Receipt, CheckCircle2, User, Wallet, PiggyBank, History, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { Separator } from '../ui/separator';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleTransaction: SaleTransaction | null;
  staffMap?: Map<string, StaffMember>;
}

export function ReceiptModal({ isOpen, onClose, saleTransaction, staffMap }: ReceiptModalProps) {
  const { settings, isLoadingSettings: isSettingsLoading } = useSettings();
  const firestore = useFirestore();
  const currencySymbol = settings?.currency || '$';

  const {
    enableExternalPrinter = true,
    storeName: globalStoreName = 'StoreLink Pro',
    receiptFooterMessage,
    storeAddress: globalStoreAddress,
    storePhone: globalStoreContact,
    creditPaymentInstructions,
    invoiceAccentColor = '#ec5b13',
    invoiceLogoUrl: globalInvoiceLogoUrl,
    storeLogoUrl: globalStoreLogoUrl,
    invoiceLogoHeight = 50,
    terminalLogoHeight = 60,
  } = settings || {};

  const { toast } = useToast();
  const [activeFormat, setActiveFormat] = useState<'small' | 'a4'>('small');
  const [isPrinting, setIsPrinting] = useState(false);
  const [localReprintCount, setLocalReprintCount] = useState(0);

  const storeName = globalStoreName;
  const storeAddress = globalStoreAddress;
  const storeContact = globalStoreContact;
  const invoiceLogoUrl = globalInvoiceLogoUrl;
  const storeLogoUrl = globalStoreLogoUrl;

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setActiveFormat('small');
      setLocalReprintCount(saleTransaction?.reprintCount || 0);
    }
  }

  const transactionDetails = useMemo(() => {
    if (!saleTransaction) return null;
    const grandTotal = saleTransaction.grandTotal ?? 0;
    const returnedAmount = saleTransaction.returnedAmount ?? 0;
    
    return {
      ...saleTransaction,
      id: saleTransaction.id,
      subtotal: saleTransaction.subtotal || 0,
      discountAmountCalculated: saleTransaction.discountAmountCalculated || 0,
      paymentMethod: saleTransaction.paymentMethod || 'N/A',
      isCreditSale: saleTransaction.isCreditSale || false,
      isPaid: saleTransaction.isPaid || false,
      returnedAmount: returnedAmount, 
      netTotal: grandTotal - returnedAmount,
    };
  }, [saleTransaction]);

  const jsCreatedAt = useMemo(() => convertToDateSafely(transactionDetails?.createdAt), [transactionDetails?.createdAt]);
  const jsDueDate = useMemo(() => convertToDateSafely(transactionDetails?.dueDate), [transactionDetails?.dueDate]);

  const staffName = useMemo(() => {
    if (!saleTransaction?.staffId) return 'N/A';
    if (staffMap) {
        const staff = staffMap.get(saleTransaction.staffId);
        if (staff) return staff.name;
    }
    return saleTransaction.staffId.substring(0, 8);
  }, [saleTransaction, staffMap]);

  const getReceiptTitle = useCallback((format: 'small' | 'a4') => {
    let baseTitle = format === 'small' ? 'SALE RECEIPT' : 'INVOICE';
    
    if (transactionDetails?.returnStatus === 'fullyReturned') {
      baseTitle = format === 'small' ? 'RETURN RECEIPT' : 'CREDIT NOTE';
    } else if (transactionDetails?.returnStatus === 'partiallyReturned') {
      baseTitle = format === 'small' ? 'UPDATED RECEIPT' : 'UPDATED INVOICE';
    }

    return baseTitle;
  }, [transactionDetails]);

  const getDocPrefix = useCallback(() => {
    if (transactionDetails?.returnStatus === 'fullyReturned') return 'CRN';
    if (transactionDetails?.returnStatus === 'partiallyReturned') return 'UPD';
    return 'INV';
  }, [transactionDetails]);
  
  const printStyles = useMemo(() => {
    const accentColor = invoiceAccentColor || '#ec5b13';

    return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
      
      body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        margin: 0;
        padding: 0;
        background-color: white;
      }

      .brand-color { color: ${accentColor}; }
      .brand-bg { background-color: ${accentColor}; }
      .brand-border { border-color: ${accentColor}; }
      
      /* Terminal Styling */
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

      .item-row { margin-bottom: 8px; }
      .item-main { display: flex; justify-content: space-between; font-weight: 700; }
      .item-meta { font-size: 10px; color: #333; }

      .totals-section { margin-top: 10px; }
      .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .grand-total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-top: 5px; padding-top: 5px; border-top: 1px solid black; }

      .account-status-box { 
        border: 1px solid black; 
        padding: 8px; 
        margin: 10px 0; 
        font-size: 10px;
      }
      .account-status-title { text-align: center; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid black; padding-bottom: 2px; }

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
        color: ${accentColor};
        opacity: 0.03;
        pointer-events: none;
        user-select: none;
        z-index: 0;
      }

      .status-banner {
        background-color: rgba(236, 91, 19, 0.1);
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(236, 91, 19, 0.1);
        margin: -20mm -20mm 20mm -20mm;
      }

      .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
      .invoice-header-left { flex: 1; }
      .invoice-header-right { text-align: right; }
      .invoice-title { font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -0.05em; }
      
      .meta-grid { display: flex; gap: 40px; margin-bottom: 40px; border-top: 1px solid #eee; pt: 20px; }
      .meta-item { flex: 1; }
      .meta-label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.1em; margin-bottom: 4px; }
      .meta-value { font-size: 14px; font-weight: 700; color: #111827; }

      .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      .table th { 
        background-color: #f9fafb;
        padding: 12px 15px;
        text-align: left;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        color: #6b7280;
        border: 1px solid #e5e7eb;
      }
      .table td { 
        padding: 15px;
        border: 1px solid #e5e7eb;
        font-size: 13px;
      }

      .summary-area { display: flex; justify-content: flex-end; }
      .summary-box { width: 300px; }
      .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
      .grand-total { border-top: 2px solid #111827; margin-top: 10px; padding-top: 15px; font-weight: 900; font-size: 24px; letter-spacing: -0.05em; }

      .account-position-box {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 20px;
        border-radius: 16px;
        margin-top: 30px;
      }

      @media print {
        @page { size: auto; margin: 0; }
        .no-print { display: none !important; }
      }
    </style>
    `;
  }, [invoiceAccentColor, invoiceLogoHeight, terminalLogoHeight]);

  const handlePrint = useCallback(async (formatToPrint: 'small' | 'a4') => {
    if (!saleTransaction || isPrinting || !firestore) return;

    if (!enableExternalPrinter) {
      setIsPrinting(true);
      try {
        const saleRef = doc(firestore, "saleTransactions", saleTransaction.id);
        await updateDoc(saleRef, { reprintCount: increment(1) });
        setLocalReprintCount(prev => prev + 1);
      } catch (error: any) {
        console.error("Reprint log failed", error);
      }
    }

    const printableAreaId = formatToPrint === 'small' ? 'printable-small-receipt' : 'printable-a4-invoice';
    const printableArea = document.getElementById(printableAreaId);

    if (!printableArea) return;

    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (!printWindow) return;

    const contentClone = printableArea.cloneNode(true) as HTMLElement;
    contentClone.querySelectorAll('.no-print').forEach(el => el.remove());
    
    const documentContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Print - ${formatToPrint === 'small' ? 'Receipt' : 'Invoice'}</title>
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
  }, [saleTransaction, isPrinting, firestore, enableExternalPrinter, printStyles]);
  
  const handleDownloadPdf = useCallback(() => {
    toast({
      title: "Preparing Download",
      description: "Your A4 Invoice will open in a print dialog. Please use the 'Save as PDF' or 'Print to PDF' option.",
      duration: 8000,
    });
    handlePrint('a4');
  }, [toast, handlePrint]);
  
  if (!isOpen || !saleTransaction || !transactionDetails) return null;

  const {
    id,
    subtotal,
    discountAmountCalculated,
    grandTotal,
    paymentMethod,
    isCreditSale,
    oldBalanceAtTimeOfSale,
    newBalanceAtTimeOfSale,
    depositBalanceAtTimeOfSale,
    initialPaymentMadeAtTimeOfSale,
  } = transactionDetails;

  const isFullyPaid = transactionDetails.isPaid;
  const showAccountPosition = !!transactionDetails.customerId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] p-0 h-[90vh] sm:h-[85vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b no-print">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
             Receipt & Invoice
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Transaction ID: <span className="font-mono break-all">{id}</span>
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
              <div id="printable-small-receipt" className="terminal-receipt bg-white shadow-xl mx-auto rounded-sm scale-90 sm:scale-100 origin-top">
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
                <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '5px 0' }}>
                  {getReceiptTitle('small')}
                </div>
                <div className="divider-dashed"></div>

                <div className="space-y-1" style={{ fontSize: '10px' }}>
                  <div className="flex justify-between">
                    <span>DATE: {jsCreatedAt ? format(jsCreatedAt, 'yyyy-MM-dd') : 'N/A'}</span>
                    <span>TIME: {jsCreatedAt ? format(jsCreatedAt, 'HH:mm:ss') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID: #{getDocPrefix()}-{id.substring(0, 8).toUpperCase()}</span>
                    <span>STAFF: {staffName.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CUSTOMER: {transactionDetails.customerName?.toUpperCase() || 'WALK-IN'}</span>
                  </div>
                </div>

                <div className="divider-dashed"></div>

                <div className="space-y-3">
                  {transactionDetails.items.map((item, idx) => (
                    <div key={idx} className="item-row">
                      <div className="item-main">
                        <span>{item.productName.toUpperCase()}</span>
                        <span>{formatCurrency(item.totalPrice, currencySymbol)}</span>
                      </div>
                      {item.selectedOptions && (
                        <div className="item-meta" style={{ fontStyle: 'italic', marginBottom: '2px' }}>
                          {Object.values(item.selectedOptions).join(' / ').toUpperCase()}
                        </div>
                      )}
                      <div className="item-meta">
                        {item.quantity} x {formatCurrency(item.unitPrice, currencySymbol)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="divider-dashed"></div>

                <div className="totals-section">
                  <div className="total-row">
                    <span>SUBTOTAL:</span>
                    <span>{formatCurrency(subtotal, currencySymbol)}</span>
                  </div>
                  {discountAmountCalculated && discountAmountCalculated > 0 && (
                    <div className="total-row" style={{ color: 'red' }}>
                      <span>DISCOUNT:</span>
                      <span>-{formatCurrency(discountAmountCalculated, currencySymbol)}</span>
                    </div>
                  )}
                  {transactionDetails.taxAmountCalculated && transactionDetails.taxAmountCalculated > 0 && (
                    <div className="total-row">
                      <span>{settings?.taxName || 'TAX'} ({transactionDetails.taxRate}%):</span>
                      <span>{formatCurrency(transactionDetails.taxAmountCalculated, currencySymbol)}</span>
                    </div>
                  )}
                  <div className="grand-total-row">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(grandTotal, currencySymbol)}</span>
                  </div>
                </div>

                {showAccountPosition && (
                    <div className="account-status-box">
                        <div className="account-status-title">ACCOUNT SUMMARY</div>
                        <div className="flex justify-between">
                            <span>PREVIOUS DEBT:</span>
                            <span>{formatCurrency(oldBalanceAtTimeOfSale || 0, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>THIS PURCHASE:</span>
                            <span>{formatCurrency(grandTotal, currencySymbol)}</span>
                        </div>
                        {isCreditSale && (
                            <div className="flex justify-between">
                                <span>PAID NOW:</span>
                                <span>-{formatCurrency(initialPaymentMadeAtTimeOfSale || 0, currencySymbol)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold" style={{ borderTop: '1px solid black', marginTop: '3px', paddingTop: '3px' }}>
                            <span>NEW DEBT TOTAL:</span>
                            <span>{formatCurrency(newBalanceAtTimeOfSale || 0, currencySymbol)}</span>
                        </div>
                        {(depositBalanceAtTimeOfSale || 0) > 0.01 && (
                            <div className="flex justify-between mt-1 text-xs">
                                <span>EXISTING DEPOSITS:</span>
                                <span>{formatCurrency(depositBalanceAtTimeOfSale || 0, currencySymbol)}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="divider-dashed"></div>

                <div className="space-y-1" style={{ fontSize: '10px' }}>
                  <div className="flex justify-between">
                    <span>METHOD:</span>
                    <span>{paymentMethod.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <span>{isFullyPaid ? 'PAID' : 'CREDIT'}</span>
                  </div>
                </div>

                <div className="divider-double"></div>

                <footer style={{ textAlign: 'center', marginTop: '10px' }}>
                  {receiptFooterMessage && <p style={{ fontWeight: 'bold' }}>{receiptFooterMessage.toUpperCase()}</p>}
                  <p style={{ fontSize: '8px', marginTop: '5px' }}>POWERED BY StoreLink Pro</p>
                </footer>
              </div>
            </TabsContent>

            <TabsContent value="a4" className="m-0 p-0">
               <div id="printable-a4-invoice" className="invoice-container shadow-2xl rounded-xl overflow-hidden max-w-4xl mx-auto my-4">
                 {(isFullyPaid && transactionDetails.returnStatus !== 'fullyReturned') && <div className="paid-watermark">PAID</div>}
                 {transactionDetails.returnStatus === 'fullyReturned' && <div className="paid-watermark">CREDIT</div>}
                 
                 <div className="status-banner no-print" style={{backgroundColor: 'rgba(236, 91, 19, 0.1)'}}>
                    <div className="flex items-center gap-2 brand-color font-bold tracking-wider text-sm">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{transactionDetails.returnStatus === 'fullyReturned' ? 'RETURN PROCESSED' : isFullyPaid ? 'PAYMENT SUCCESSFUL' : 'CREDIT TRANSACTION'}</span>
                    </div>
                    <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                        Ref: #{getDocPrefix()}-{id.substring(0, 12).toUpperCase()}
                    </div>
                 </div>

                 <div className="p-10 space-y-10 relative z-10">
                    <div className="flex flex-wrap justify-between items-start gap-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                                {getReceiptTitle('a4')} <span className="brand-color">#{getDocPrefix()}-{jsCreatedAt ? format(jsCreatedAt, 'yyyy') : new Date().getFullYear()}-{id.substring(0, 4).toUpperCase()}</span>
                            </h1>
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Issued Date</p>
                                    <p className="text-gray-700 font-bold">{jsCreatedAt ? format(jsCreatedAt, 'MMMM dd, yyyy') : 'N/A'}</p>
                                </div>
                                {isCreditSale && jsDueDate && (
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                                        <p className="text-gray-700 font-bold">{format(jsDueDate, 'MMMM dd, yyyy')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                            {invoiceLogoUrl ? (
                                <img src={invoiceLogoUrl} alt={storeName} style={{ maxHeight: `${invoiceLogoHeight}px`, width: 'auto', objectFit: 'contain' }} className="mb-2" />
                            ) : (
                                <div className="brand-bg px-6 py-2 rounded-full text-white font-black text-lg tracking-widest shadow-md">
                                    {transactionDetails.returnStatus === 'fullyReturned' ? 'RETURNED' : isFullyPaid ? 'PAID' : 'CREDIT'}
                                </div>
                            )}
                            <p className="text-gray-500 text-sm italic">Official Transaction Receipt</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-gray-100 pt-10">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black brand-color uppercase tracking-widest">Bill To</h3>
                            <div className="text-gray-800 dark:text-gray-100 space-y-1">
                                <p className="font-black text-xl">{transactionDetails.customerName || 'Walk-in Customer'}</p>
                                <p className="text-sm text-gray-500">{storeName}</p>
                                <p className="text-sm text-gray-500">{storeAddress}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xs font-black brand-color uppercase tracking-widest">From</h3>
                            <div className="text-gray-800 dark:text-gray-100 space-y-1">
                                <p className="font-black text-xl">{storeName}</p>
                                <p className="text-sm text-gray-500">{storeAddress}</p>
                                <p className="text-sm text-gray-500">{storeContact}</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'center' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactionDetails.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <p className="font-bold text-gray-900">{item.productName}</p>
                                            {item.selectedOptions && (
                                                <p className="text-xs text-gray-600 italic">
                                                    {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">ID: {item.productId.substring(0, 8)}</p>
                                        </td>
                                        <td style={{ textAlign: 'center' }} className="text-gray-700 font-medium">{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }} className="text-gray-700 font-medium">{formatCurrency(item.unitPrice, currencySymbol)}</td>
                                        <td style={{ textAlign: 'right' }} className="font-black text-gray-900">{formatCurrency(item.totalPrice, currencySymbol)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap justify-between gap-12 pt-6">
                        <div className="flex-1 space-y-6">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Meta</h3>
                                <div className="grid grid-cols-2 gap-y-3 text-sm">
                                    <span className="text-gray-500">Method:</span>
                                    <span className="font-bold text-gray-800">{paymentMethod}</span>
                                    <span className="text-gray-500">Staff:</span>
                                    <span className="font-bold text-gray-800">{staffName}</span>
                                    <span className="text-gray-500">Status:</span>
                                    <span className={cn("font-black uppercase tracking-tighter", isFullyPaid ? "text-green-600" : "text-orange-600")}>
                                        {transactionDetails.returnStatus === 'fullyReturned' ? 'Returned' : isFullyPaid ? 'Settled' : 'Outstanding'}
                                    </span>
                                </div>
                            </div>
                            
                            {showAccountPosition && (
                                <div className="account-position-box">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Customer Account Position</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Previous Account Debt:</span>
                                            <span className="font-bold">{formatCurrency(oldBalanceAtTimeOfSale || 0, currencySymbol)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Sale Impact:</span>
                                            <span className="font-bold text-gray-900">+{formatCurrency(grandTotal, currencySymbol)}</span>
                                        </div>
                                        {isCreditSale && (
                                            <div className="flex justify-between text-green-600">
                                                <span className="font-medium">Initial Payment Recv:</span>
                                                <span className="font-bold">-{formatCurrency(initialPaymentMadeAtTimeOfSale || 0, currencySymbol)}</span>
                                            </div>
                                        )}
                                        <Separator />
                                        <div className="flex justify-between text-base">
                                            <span className="font-black text-gray-900">Final Debt Balance:</span>
                                            <span className="font-black brand-color">{formatCurrency(newBalanceAtTimeOfSale || 0, currencySymbol)}</span>
                                        </div>
                                        {(depositBalanceAtTimeOfSale || 0) > 0.01 && (
                                            <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg mt-4 border border-blue-100">
                                                <span className="text-xs font-bold text-blue-700 flex items-center gap-2">
                                                    <PiggyBank className="h-4 w-4" /> Available Deposits:
                                                </span>
                                                <span className="font-black text-blue-700">{formatCurrency(depositBalanceAtTimeOfSale || 0, currencySymbol)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isCreditSale && creditPaymentInstructions && (
                                <p className="text-sm text-gray-500 leading-relaxed italic border-l-4 brand-border pl-4">
                                    &quot;{creditPaymentInstructions}&quot;
                                </p>
                            )}
                        </div>
                        <div className="w-full md:w-80 space-y-4">
                            <div className="flex justify-between items-center text-gray-600">
                                <span className="text-sm font-medium">Subtotal</span>
                                <span className="font-bold">{formatCurrency(subtotal, currencySymbol)}</span>
                            </div>
                            {discountAmountCalculated && discountAmountCalculated > 0 && (
                                <div className="flex justify-between items-center text-red-500">
                                    <span className="text-sm font-medium">Discount</span>
                                    <span className="font-bold">-{formatCurrency(discountAmountCalculated, currencySymbol)}</span>
                                </div>
                            )}
                            {transactionDetails.taxAmountCalculated && transactionDetails.taxAmountCalculated > 0 && (
                                <div className="flex justify-between items-center text-gray-600">
                                    <span className="text-sm font-medium">{settings?.taxName || 'Tax'} ({transactionDetails.taxRate}%)</span>
                                    <span className="font-bold">{formatCurrency(transactionDetails.taxAmountCalculated, currencySymbol)}</span>
                                </div>
                            )}
                            <div className="pt-4 border-t-2 border-gray-100">
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black brand-color uppercase tracking-widest">Grand Total</span>
                                        <span className="text-xs text-gray-400">{isFullyPaid ? 'Paid in full' : 'Balance due'}</span>
                                    </div>
                                    <span className="text-4xl font-black text-gray-900 tracking-tighter">
                                        {formatCurrency(grandTotal, currencySymbol)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="pt-10 border-t border-gray-100 text-center space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{storeName}</p>
                        <p className="text-[10px] text-gray-400">{storeAddress} • {storeContact}</p>
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
              <Button onClick={handleDownloadPdf} variant="secondary" className="w-full sm:w-auto" disabled={isPrinting}>
                <Download className="mr-2 h-4 w-4" /> Export PDF
              </Button>
            )}
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
