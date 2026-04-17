'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  getCountFromServer,
  where,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  History, 
  Calendar as CalendarIcon, 
  UserCircle,
  X,
  DollarSign,
  Wallet,
  Info,
  Loader2
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn, convertToDateSafely } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import type { CreditPayment, StaffMember } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-context';

const ITEMS_PER_PAGE = 15;

interface DepositAuditTabProps {
  currencySymbol: string;
}

export function DepositAuditTab({ currencySymbol }: DepositAuditTabProps) {
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, StaffMember>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchStaff = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    try {
      const q = query(collection(firestore, 'staff'), where('store_id', '==', currentStoreId));
      const snapshot = await getDocs(q);
      const map = new Map<string, StaffMember>();
      snapshot.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as StaffMember));
      setStaffMap(map);
    } catch (e) {
      console.error("Staff fetch failed", e);
    }
  }, [firestore, currentStoreId]);

  const fetchPayments = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      let q = query(collection(firestore, 'creditPayments'), where('store_id', '==', currentStoreId), orderBy('paymentDate', 'desc'));

      if (dateRange?.from) {
        q = query(q, where('paymentDate', '>=', startOfDay(dateRange.from)));
        if (dateRange.to) {
          q = query(q, where('paymentDate', '<=', endOfDay(dateRange.to)));
        }
      }

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCount(countSnap.data().count);
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

        setPayments(docs.map(d => ({ id: d.id, ...d.data() } as CreditPayment)));
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setPayments([]);
          setIsLastPage(true);
        }
      }
    } catch (error) {
      console.error("Payment audit fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, dateRange]);

  useEffect(() => {
    fetchStaff();
    fetchPayments('initial');
  }, [fetchStaff, fetchPayments, dateRange]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    const term = searchTerm.toLowerCase().trim();
    return payments.filter(p => 
      p.customerName.toLowerCase().includes(term) || 
      p.paymentMethod.toLowerCase().includes(term) ||
      p.notes?.toLowerCase().includes(term)
    );
  }, [payments, searchTerm]);

  const handlePrevPage = () => fetchPayments('prev');
  const handleNextPage = () => fetchPayments('next');

  return (
    <div className="space-y-6">
      <Card className="shadow-none bg-muted/10 border-dashed border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Audit search by customer name, method or narration..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 h-11" 
              />
              {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 font-bold px-4 w-full md:w-auto border-primary/20">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Filter Period'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => fetchPayments('initial')} disabled={isLoading}>
              <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className=" border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Financial Audit Ledger</CardTitle>
              <CardDescription>A chronological trace of all funds entering flexible accounts.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-transparent">
                  <TableHead className="pl-6 font-black uppercase text-[10px] tracking-widest">Timestamp</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Account Registry</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Amount Recv.</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Protocol</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Performed By</TableHead>
                  <TableHead className="pr-6 font-black uppercase text-[10px] tracking-widest">Audit Narration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && payments.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                  ))
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                      No deposit records found in current batch.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => {
                    const date = convertToDateSafely(p.paymentDate);
                    const staff = staffMap.get(p.staffId);
                    return (
                      <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors border-b last:border-0">
                        <TableCell className="pl-6 py-4">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                            {date ? format(date, 'EEEE - dd- yyyy') : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase font-black">
                            {date ? `time ${format(date, 'hh:mm a')}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-black text-sm text-gray-900 dark:text-gray-100 leading-tight">{p.customerName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">REF: {p.id.substring(0, 12).toUpperCase()}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-base font-black text-emerald-600">
                            +{formatCurrency(p.amount, currencySymbol)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="h-5 text-[9px] font-black uppercase tracking-tighter bg-background  border-primary/20 text-primary">
                            {p.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <UserCircle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{staff?.name || 'Authorized Agent'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{staff?.email || ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 max-w-[200px]">
                          <p className="text-xs text-muted-foreground line-clamp-2 italic font-medium" title={p.notes || ''}>
                            {p.notes ? `"${p.notes}"` : 'No additional narration provided.'}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Batch Registry <span className="mx-2">|</span> {totalCount} Cumulative Events
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="h-10 font-bold">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoading} className="h-10 font-bold">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
