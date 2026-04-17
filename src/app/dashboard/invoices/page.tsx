
'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  where,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Search, 
  Loader2, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  FileWarning,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn, convertToDateSafely } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ITEMS_PER_PAGE = 15;

export default function ManageInvoicesPage() {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalRegistryCount, setTotalRegistryCount] = useState(0);

  // Cursors
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInvoices = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      let q = query(collection(firestore, 'invoices'), where('store_id', '==', currentStoreId), orderBy('createdAt', 'desc'));

      if (statusFilter !== 'all') {
        q = query(q, where('status', '==', statusFilter));
      }

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalRegistryCount(countSnap.data().count);
      }

      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(q, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const list = docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            createdAt: convertToDateSafely(d.data().createdAt),
            date: convertToDateSafely(d.data().date)
        }));

        setInvoices(list);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setInvoices([]);
          setIsLastPage(true);
        }
      }
    } catch (error) {
      console.error("Invoice fetch error:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load invoice registry." });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, currentStoreId, statusFilter, toast]);

  useEffect(() => {
    if (currentStoreId) {
      fetchInvoices('initial');
    }
  }, [fetchInvoices, currentStoreId]);

  const handleDelete = async () => {
    if (!invoiceToDelete || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'invoices', invoiceToDelete.id));
      toast({ title: 'Success', description: `Invoice ${invoiceToDelete.invoiceNumber} has been deleted.` });
      setInvoiceToDelete(null);
      fetchInvoices('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete invoice.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return invoices;
    return invoices.filter(inv => 
      inv.invoiceNumber?.toLowerCase().includes(term) || 
      inv.customerName?.toLowerCase().includes(term) ||
      inv.customerEmail?.toLowerCase().includes(term)
    );
  }, [invoices, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5 h-5 font-black uppercase text-[9px]"><CheckCircle2 className="h-2.5 w-2.5" /> Paid</Badge>;
      case 'credit': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1.5 h-5 font-black uppercase text-[9px]"><Clock className="h-2.5 w-2.5" /> Credit</Badge>;
      case 'draft': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 gap-1.5 h-5 font-black uppercase text-[9px]"><FileWarning className="h-2.5 w-2.5" /> Draft</Badge>;
      default: return <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase">{status}</Badge>;
    }
  };

  if (isAuthLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={FileText} 
          title="Invoice Hub" 
          description="Manage, edit, and track all generated business documents."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchInvoices('initial')} disabled={isLoading}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Sync Hub
            </Button>
            <Button asChild className="gap-2">
                <Link href="/dashboard/invoices/generate">
                    <PlusCircle className="h-4 w-4" /> Generate New
                </Link>
            </Button>
        </div>
      </div>

      <Card className=" border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <CardTitle>Invoice Registry</CardTitle>
                <CardDescription>Historical financial records with real-time status telemetry.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-grow lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search Serial or Client..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 h-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-10">
                        <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-transparent">
                  <TableHead className="pl-6 font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Serial Identifier</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Client Identity</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Magnitude</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                  <TableHead className="pr-6 text-right font-black uppercase text-[10px] tracking-widest">Protocol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && invoices.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                      No invoices found matching the current criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="group transition-colors hover:bg-muted/30 border-b last:border-0">
                      <TableCell className="pl-6 py-4">
                        <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {inv.date ? format(inv.date, 'dd MMM yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs font-black text-primary uppercase">{inv.invoiceNumber}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{inv.customerName}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{inv.customerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black">
                        {formatCurrency(inv.grandTotal, currencySymbol)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(inv.status)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                <Link href={`/dashboard/invoices/edit/${inv.id}`}>
                                    <Edit className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setInvoiceToDelete(inv)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> Total Registry: {totalRegistryCount}
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchInvoices('prev')} 
                    disabled={currentPage === 1 || isLoading}
                    className="h-10 font-bold"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchInvoices('next')} 
                    disabled={isLastPage || isLoading}
                    className="h-10 font-bold"
                >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>

      <DeleteConfirmationDialog 
        isOpen={!!invoiceToDelete} 
        onOpenChange={() => setInvoiceToDelete(null)} 
        onConfirm={handleDelete} 
        isDeleting={isDeleting} 
        itemName={invoiceToDelete?.invoiceNumber || ''} 
        itemType="invoice record" 
      />
    </div>
  );
}
