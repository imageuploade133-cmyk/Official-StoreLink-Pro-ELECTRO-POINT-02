
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, updateDoc, Timestamp, serverTimestamp, collection, query, orderBy, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Building, 
  ArrowLeft,
  CheckCircle2,
  Clock,
  Search,
  X,
  Check,
  Package,
  Landmark,
  Printer,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn, convertToDateSafely } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import type { Customer, Product } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toPng } from 'html-to-image';
import { InvoiceTrustAssets } from '@/components/invoices/InvoiceTrustAssets';

interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { staffMember, store } = useAuth();
  const { toast } = useToast();
  const printableRef = useRef<HTMLDivElement>(null);
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  const invoiceId = params.invoiceId as string;
  const invoiceRef = useMemo(() => firestore && invoiceId ? doc(firestore, 'invoices', invoiceId) : null, [firestore, invoiceId]);
  const { data: invoice, isLoading: isFetching } = useDoc<any>(invoiceRef);

  const currencySymbol = settings?.currency || '$';
  const storeName = settings?.storeName || 'StoreLink Pro';

  const [status, setStatus] = useState<'draft' | 'paid' | 'credit'>('draft');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [clientInfo, setClientInfo] = useState({ name: '', address: '', email: '', phone: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Data Fetching
  const customersQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(
      collection(firestore, 'customers'), 
      where('store_id', '==', currentStoreId),
      orderBy('name')
    );
  }, [firestore, currentStoreId]);

  const { data: customers } = useCollection<Customer>(customersQuery);

  const productsQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(
      collection(firestore, 'products'), 
      where('store_id', '==', currentStoreId),
      orderBy('name')
    );
  }, [firestore, currentStoreId]);

  const { data: products } = useCollection<Product>(productsQuery);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const term = customerSearch.toLowerCase();
    return (customers || []).filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
    ).slice(0, 5);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return (products || []).filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku?.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [products, productSearch]);

  useEffect(() => {
    if (invoice) {
      setStatus(invoice.status);
      setInvoiceNumber(invoice.invoiceNumber);
      setPaymentMethod(invoice.paymentMethod || 'Cash');
      setDate(invoice.date ? format(convertToDateSafely(invoice.date)!, "yyyy-MM-dd") : '');
      setDueDate(invoice.dueDate ? format(convertToDateSafely(invoice.dueDate)!, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
      setItems(invoice.items.map((it: any, idx: number) => ({ ...it, id: String(idx), productId: it.productId || undefined })));
      setClientInfo({ 
        name: invoice.customerName, 
        address: invoice.customerAddress, 
        email: invoice.customerEmail,
        phone: invoice.customerPhone || ''
      });
      setTaxRate(invoice.taxRate || 0);
      setDiscount(invoice.discountAmount || 0);
    }
  }, [invoice]);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), [items]);
  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = Math.max(0, subtotal + taxAmount - discount);

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(36).substring(7), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleSelectProduct = (product: Product) => {
    const newItem: InvoiceItem = {
        id: Math.random().toString(36).substring(7),
        productId: product.id,
        description: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice
    };
    setItems([...items, newItem]);
    setProductSearch('');
    toast({ title: "Product Injected", description: `${product.name} added to grid.` });
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSelectCustomer = (customer: Customer) => {
    setClientInfo({
      name: customer.name,
      address: customer.address || '',
      email: customer.email || '',
      phone: customer.phone || ''
    });
    setCustomerSearch('');
    toast({ title: "Profile Linked", description: `${customer.name} verified.` });
  };

  const handleSaveInvoice = async () => {
    if (!firestore || !invoiceId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'invoices', invoiceId), {
        invoiceNumber,
        status,
        date: Timestamp.fromDate(new Date(date)),
        dueDate: status === 'credit' ? Timestamp.fromDate(new Date(dueDate)) : null,
        paymentMethod: status === 'paid' ? paymentMethod : null,
        customerName: clientInfo.name,
        customerAddress: clientInfo.address,
        customerEmail: clientInfo.email,
        customerPhone: clientInfo.phone,
        items: items.map(item => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        })),
        subtotal,
        taxRate,
        taxAmount,
        discountAmount: discount,
        grandTotal: total,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Record Synchronized", description: `${invoiceNumber} registry updated.` });
      router.push('/dashboard/invoices');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!printableRef.current) return;
    setIsSaving(true);
    try {
      const dataUrl = await toPng(printableRef.current, { 
        cacheBust: true, 
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains('no-print')) {
                return false;
            }
            return true;
        }
      });
      const link = document.createElement('a');
      link.download = `invoice-${invoiceNumber}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Image Exported", description: "The invoice has been saved as a high-res image." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate image file." });
    } finally {
      setIsSaving(false);
    }
  };

  const showBackground = settings?.invoiceShowBackground && settings.invoiceBackgroundUrl;

  if (isFetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <PageHeader 
          icon={FileText} 
          title="Refine Invoice" 
          description={`Operational adjustment for record: ${invoiceNumber}`}
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleDownloadImage} disabled={isSaving} className="rounded-xl border-primary/20 text-primary h-11 px-6 font-bold shadow-sm">
            <ImageIcon className="mr-2 h-4 w-4" /> Export Image
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={isSaving} className="rounded-xl border-primary/20 text-primary h-11 px-6 font-bold shadow-sm">
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
          <Button onClick={handleSaveInvoice} disabled={isSaving} className="rounded-xl shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-11 px-8">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Confirm Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Configuration Sidebar */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <Card className="shadow-xl border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <CardTitle>Identity & Protocol</CardTitle>
              <CardDescription>Adjust the lifecycle stage of this document.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Settlement Mode</Label>
                <Tabs value={status} onValueChange={(v: any) => setStatus(v)} className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="draft" className="text-[10px] font-black uppercase tracking-widest rounded-lg">Draft</TabsTrigger>
                    <TabsTrigger value="paid" className="text-[10px] font-black uppercase tracking-widest rounded-lg text-green-600">Paid</TabsTrigger>
                    <TabsTrigger value="credit" className="text-[10px] font-black uppercase tracking-widest rounded-lg text-orange-600">Unpaid</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Serial Identifier</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="font-mono font-bold h-11" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date Issued</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 font-bold" />
                  </div>
                  {status === 'credit' ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-orange-600 font-black">Payback Date</Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border-orange-200 h-11 font-black text-orange-600" />
                    </div>
                  ) : status === 'paid' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-green-600 font-black">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-11 border-green-200 font-bold text-green-700">
                                <SelectValue placeholder="Method" />
                            </SelectTrigger>
                            <SelectContent>
                                {settings?.paymentMethods?.map(m => (
                                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                )) || (
                                    <>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Card">Card</SelectItem>
                                        <SelectItem value="Bank Transfer">Transfer</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none ring-1 ring-border">
            <CardHeader className="bg-muted/30">
              <CardTitle>Recipient Metadata</CardTitle>
              <CardDescription>Verified client profile linked to this record.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="space-y-3 relative">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Search for existing customer</Label>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Type name, email or phone..." 
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="pl-10 h-11 rounded-xl shadow-inner border-none bg-slate-50"
                        />
                        {customerSearch && (
                            <button onClick={() => setCustomerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {filteredCustomers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-900 border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <ScrollArea className="max-h-64">
                                <div className="p-2 space-y-1">
                                    {filteredCustomers.map(customer => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full text-left p-3 hover:bg-primary/5 rounded-xl flex items-center justify-between group transition-all"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-black text-sm truncate">{customer.name}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{customer.email || customer.phone}</p>
                                            </div>
                                            <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" strokeWidth={3} />
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <Separator className="border-dashed" />

                <div className="space-y-4">
                    <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input value={clientInfo.name} onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})} className="h-11 font-bold" />
                    </div>
                    <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={clientInfo.email} onChange={(e) => setClientInfo({...clientInfo, email: e.target.value})} className="h-11" />
                    </div>
                    <div className="space-y-2">
                    <Label>Logistics Address</Label>
                    <Input value={clientInfo.address} onChange={(e) => setClientInfo({...clientInfo, address: e.target.value})} className="h-11" />
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Area */}
        <div className="lg:col-span-8 space-y-8">
          <div ref={printableRef} id="printable-area" className="relative bg-white dark:bg-slate-900 overflow-hidden min-h-[1100px] flex flex-col w-full max-w-[800px] mx-auto shadow-2xl rounded-[2.5rem] print:shadow-none print:max-w-none print:rounded-none">
              
              {/* Full Document Background (Letterhead) */}
              {showBackground && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <Image 
                        src={settings.invoiceBackgroundUrl!} 
                        alt="Full Document Background" 
                        fill 
                        className="object-fill" 
                        unoptimized 
                    />
                </div>
              )}

              {/* Optional Top Banner (Letterhead) */}
              {settings?.invoiceShowTopBanner && settings.invoiceTopBannerUrl && (
                <div className="w-full relative aspect-[21/4] mb-8 shrink-0 z-10">
                    <Image 
                        src={settings.invoiceTopBannerUrl} 
                        alt="Letterhead" 
                        fill 
                        className="object-contain" 
                        unoptimized 
                    />
                </div>
              )}

              <div className="p-8 md:p-16 flex-grow flex flex-col pt-0 relative z-10">
                {/* Status Watermark Overlay */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-[1] opacity-[0.03] dark:opacity-[0.05]">
                    <span className={cn(
                    "text-[120px] font-black uppercase tracking-[0.2em] transform -rotate-45 whitespace-nowrap",
                    status === 'paid' ? "text-green-600" : status === 'credit' ? "text-orange-600" : "text-slate-900 dark:text-white"
                    )}>
                    {status === 'paid' ? 'VERIFIED PAID' : status === 'credit' ? 'OUTSTANDING' : 'DRAFT'}
                    </span>
                </div>

                {/* Custom Brand Watermark Overlay */}
                {settings?.invoiceEnableTextWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0" style={{ opacity: settings.invoiceWatermarkOpacity || 0.05 }}>
                        {settings.invoiceWatermarkType === 'image' && settings.invoiceWatermarkImageUrl ? (
                            <div style={{ width: settings.invoiceWatermarkImageWidth || 400, transform: `rotate(${settings.invoiceWatermarkRotation || -45}deg)` }}>
                                <img src={settings.invoiceWatermarkImageUrl} alt="" className="w-full h-auto" />
                            </div>
                        ) : (
                            <span className="font-black uppercase tracking-[0.2em] whitespace-nowrap" style={{ 
                                fontSize: `${settings.invoiceWatermarkFontSize || 120}px`,
                                color: settings.invoiceWatermarkColor || '#000000',
                                transform: `rotate(${settings.invoiceWatermarkRotation || -45}deg)`
                            }}>
                                {settings.invoiceWatermarkText || 'OFFICIAL DOCUMENT'}
                            </span>
                        )}
                    </div>
                )}

                <div className="relative z-10 space-y-12 flex-grow">
                    <div className={cn(
                        "flex gap-8",
                        settings?.invoiceHideStoreInfo ? "flex-row items-center justify-between w-full" : "flex-wrap items-start justify-between"
                    )}>
                    {!settings?.invoiceHideStoreInfo && (
                        <div className="flex items-start gap-6 flex-1 min-w-[300px]">
                            <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner shrink-0">
                            {settings?.invoiceLogoUrl ? (
                                <Image src={settings.invoiceLogoUrl} alt="Store Logo" width={80} height={80} className="object-contain" unoptimized />
                            ) : (
                                <Building className="h-10 w-10" />
                            )}
                            </div>
                            <div className="text-left">
                            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{storeName}</h3>
                            <p className="text-slate-500 text-sm font-medium mt-1">{settings?.storeAddress || 'Global Headquarters'}</p>
                            <p className="text-slate-400 text-[10px] font-black uppercase mt-0.5">{settings?.storeEmail} | {settings?.storePhone}</p>
                            </div>
                        </div>
                    )}
                    <div className={cn("shrink-0", settings?.invoiceHideStoreInfo ? "w-full flex flex-row items-center justify-between gap-8" : "text-right")}>
                        <div className={cn("flex flex-col gap-2", settings?.invoiceHideStoreInfo ? "items-start" : "items-end")}>
                            <h1 className={cn(
                            "text-6xl font-black tracking-tighter leading-none",
                            status === 'paid' ? "text-green-600" : status === 'credit' ? "text-orange-600" : "text-slate-900 dark:text-white"
                            )} style={status === 'draft' ? { color: settings?.invoiceAccentColor } : {}}>INVOICE</h1>
                            <div className="flex gap-2">
                                {status === 'paid' && (
                                    <Badge className="bg-green-600 text-white font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px] shadow-lg border-none">
                                        <CheckCircle2 className="h-3 w-3 mr-1.5" /> Fully Settled
                                    </Badge>
                                )}
                                {status === 'credit' && (
                                    <Badge className="bg-orange-600 text-white font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px] shadow-lg border-none">
                                        <Clock className="h-3 w-3 mr-1.5" /> Due {format(new Date(dueDate), 'MMM dd')}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className={cn(
                            "bg-slate-50 dark:bg-slate-800 p-6 rounded-[1.5rem] border shadow-sm",
                            settings?.invoiceHideStoreInfo ? "text-left min-w-[240px]" : "text-left inline-block min-w-[240px] mt-6"
                        )}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Serial Identifier</p>
                        <p className="text-lg font-mono font-black">{invoiceNumber}</p>
                        <Separator className="my-4" />
                        <div className={cn("grid gap-4", settings?.invoiceHideStoreInfo ? "grid-cols-2 gap-x-8" : "grid-cols-2")}>
                            <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Issued</p>
                            <p className="text-xs font-bold">{date ? format(new Date(date), 'MMM dd, yyyy') : '---'}</p>
                            </div>
                            {status === 'credit' ? (
                            <div>
                                <p className="text-[10px] font-black uppercase text-orange-500 mb-1">DUE DATE</p>
                                <p className="text-xs font-black text-orange-600">{dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : '---'}</p>
                            </div>
                            ) : status === 'paid' && (
                                <div>
                                    <p className="text-[10px] font-black uppercase text-green-600 mb-1">VERIFICATION</p>
                                    <p className="text-xs font-black text-green-700">{paymentMethod}</p>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                    </div>

                    <div className="flex flex-wrap gap-8">
                    <div className={cn("min-w-[300px] p-8 rounded-[2rem] border bg-slate-50/50 dark:bg-slate-800/50 space-y-2 flex-1")}>
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Billed To</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{clientInfo.name || '---'}</p>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed italic">{clientInfo.address}</p>
                    </div>
                    <div className="flex-1 min-w-[300px] p-8 rounded-[2rem] border bg-slate-50/50 dark:bg-slate-800/50 space-y-4 no-print">
                        <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                            <Package className="h-3.5 w-3.5" /> Find Products
                        </div>
                        <div className="relative group/psearch">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/psearch:text-primary transition-colors" />
                            <Input 
                                placeholder="Inject inventory item..." 
                                className="h-12 pl-10 rounded-2xl border-none shadow-inner bg-white dark:bg-slate-900 font-bold"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                            {filteredProducts.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-slate-900 border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                                    <ScrollArea className="max-h-64">
                                        <div className="p-2 space-y-1">
                                            {filteredProducts.map(product => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => handleSelectProduct(product)}
                                                    className="w-full text-left p-3 hover:bg-primary/5 rounded-xl flex items-center justify-between group transition-all"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-black text-sm truncate">{product.name}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">SKU: {product.sku || 'N/A'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-xs text-primary">{formatCurrency(product.sellingPrice, currencySymbol)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>

                    <div className="space-y-4">
                    <div className="flex items-center justify-between px-4 no-print">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Registry Items</h4>
                        <button type="button" onClick={handleAddItem} className="h-8 rounded-full font-black text-[10px] uppercase gap-2 bg-primary/5 text-primary flex items-center px-4 shadow-sm">
                        <Plus className="h-3.5 w-3.5" /> Manual Row
                        </button>
                    </div>
                    <div className="rounded-[2rem] border overflow-hidden bg-transparent shadow-sm">
                        <table className="w-full text-left">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500">Description</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 text-center">Qty</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 text-right">Unit Val</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 text-right">Magnitude</th>
                            <th className="w-12 px-4 no-print"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {items.map((item) => (
                            <tr key={item.id} className="group hover:bg-muted/5">
                                <td className="px-8 py-6">
                                <div className="no-print">
                                    <Input 
                                        value={item.description} 
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        className="border-none bg-transparent p-0 h-auto font-black text-sm focus-visible:ring-0 shadow-none"
                                    />
                                </div>
                                <p className="hidden print:block font-black text-sm">{item.description}</p>
                                </td>
                                <td className="px-8 py-6 text-center">
                                <div className="no-print">
                                    <Input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                        className="border-none bg-transparent p-0 h-auto font-bold text-center focus-visible:ring-0 shadow-none w-16 mx-auto"
                                    />
                                </div>
                                <p className="hidden print:block font-bold text-center">{item.quantity}</p>
                                </td>
                                <td className="px-8 py-6 text-right font-medium text-slate-500">
                                <div className="no-print">
                                    <Input 
                                        type="number" 
                                        value={item.unitPrice} 
                                        onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                        className="border-none bg-transparent p-0 h-auto font-bold text-right focus-visible:ring-0 shadow-none w-24 ml-auto"
                                    />
                                </div>
                                <p className="hidden print:block font-bold text-right">{formatCurrency(item.unitPrice, currencySymbol)}</p>
                                </td>
                                <td className="px-8 py-6 text-right font-black">
                                {formatCurrency(item.quantity * item.unitPrice, currencySymbol)}
                                </td>
                                <td className="px-4 text-center no-print">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-destructive h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between gap-16 relative mt-12 mb-auto">
                    <InvoiceTrustAssets 
                        settings={settings} 
                        status={status} 
                        invoiceAccentColor={settings?.invoiceAccentColor}
                    />

                    <div className="min-w-[320px] space-y-4">
                        <div className="space-y-3 px-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-bold uppercase">Subtotal</span>
                            <span className="font-black">{formatCurrency(subtotal, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 no-print">
                            <Label className="text-slate-400 font-bold uppercase text-[10px]">Tax %</Label>
                            <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="h-8 w-16 text-center text-xs font-bold rounded-lg" />
                            </div>
                            <span className="hidden print:inline text-slate-400 font-bold uppercase text-[10px]">Tax ({taxRate}%)</span>
                            <span className="font-black">{formatCurrency(taxAmount, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 no-print">
                            <Label className="text-slate-400 font-bold uppercase text-[10px]">Discount</Label>
                            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-8 w-24 text-right text-xs font-bold rounded-lg" />
                            </div>
                            <span className="hidden print:inline text-slate-400 font-bold uppercase text-[10px]">Discount</span>
                            <span className="font-black text-green-600">-{formatCurrency(discount, currencySymbol)}</span>
                        </div>
                        </div>
                        <div className={cn(
                        "mt-6 p-8 rounded-[2rem] text-white flex flex-col gap-1 shadow-2xl transition-all duration-500",
                        status === 'paid' ? "bg-green-600 shadow-green-600/20" : status === 'credit' ? "bg-orange-600 shadow-orange-600/20" : "bg-primary shadow-primary/20"
                        )} style={status === 'draft' ? { backgroundColor: settings?.invoiceAccentColor } : {}}>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">
                            {status === 'paid' ? 'AMOUNT PAID' : status === 'credit' ? 'BALANCE DUE' : 'GRAND TOTAL'}
                        </span>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold">Valid</span>
                            <span className="text-4xl font-black tracking-tighter">{formatCurrency(total, currencySymbol)}</span>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Document Baseline Footer */}
                <footer className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800 text-center space-y-4 pb-16">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            {settings?.invoiceFooterText || `Thank you for choosing ${storeName}. We appreciate your premium business.`}
                            {status === 'credit' && ` | Full settlement mandated by ${format(new Date(dueDate), 'PP')}.`}
                        </p>
                    </div>
                </footer>
              </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          main, .layout-container { padding: 0 !important; margin: 0 !important; }
          .layout-content-container { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-maxWidth: 100% !important; }
          #printable-area { 
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            border: none;
            box-shadow: none;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
