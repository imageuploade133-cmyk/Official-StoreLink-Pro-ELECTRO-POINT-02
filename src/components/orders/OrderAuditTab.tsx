
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
  Info,
  Loader2,
  ArrowRight,
  ClipboardList,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn, convertToDateSafely } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

const ITEMS_PER_PAGE = 20;

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'pending': return <Clock className="h-3 w-3" />;
        case 'processing': return <Package className="h-3 w-3" />;
        case 'shipped': return <Truck className="h-3 w-3" />;
        case 'delivered': return <CheckCircle2 className="h-3 w-3" />;
        case 'cancelled': return <XCircle className="h-3 w-3" />;
        default: return null;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'shipped': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
        case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

export function OrderAuditTab() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchAuditLogs = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      let q = query(collection(firestore, 'orderAudit'), orderBy('timestamp', 'desc'));

      if (dateRange?.from) {
        q = query(q, where('timestamp', '>=', startOfDay(dateRange.from)));
        if (dateRange.to) {
          q = query(q, where('timestamp', '<=', endOfDay(dateRange.to)));
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

        const logs = docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            timestamp: convertToDateSafely(d.data().timestamp)
        }));

        setAuditLogs(logs);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setAuditLogs([]);
          setIsLastPage(true);
        }
      }
    } catch (error) {
      console.error("Order audit fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, dateRange]);

  useEffect(() => {
    fetchAuditLogs('initial');
  }, [fetchAuditLogs, dateRange]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return auditLogs;
    const term = searchTerm.toLowerCase().trim();
    return auditLogs.filter(log => 
      log.orderId.toLowerCase().includes(term) || 
      log.staffName.toLowerCase().includes(term) ||
      log.staffEmail.toLowerCase().includes(term)
    );
  }, [auditLogs, searchTerm]);

  const handlePrevPage = () => fetchAuditLogs('prev');
  const handleNextPage = () => fetchAuditLogs('next');

  return (
    <div className="space-y-6">
      <Card className="shadow-none bg-muted/10 border-dashed border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Audit search by Order ID or Staff..." 
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
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => fetchAuditLogs('initial')} disabled={isLoading}>
              <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Fulfillment Audit Ledger</CardTitle>
              <CardDescription>Comprehensive operational trace of every web order status change.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-transparent">
                  <TableHead className="pl-6 font-black uppercase text-[10px] tracking-widest">Timestamp</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Order Reference</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Status Shift</TableHead>
                  <TableHead className="pr-6 font-black uppercase text-[10px] tracking-widest">Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && auditLogs.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={4} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                      No operational logs found in current batch.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const date = convertToDateSafely(log.timestamp);
                    return (
                      <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors border-b last:border-0">
                        <TableCell className="pl-6 py-4">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                            {date ? format(date, 'EEEE - dd- yyyy') : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase font-black">
                            {date ? `time ${format(date, 'hh:mm a')}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-xs font-black text-primary">#{log.orderId.substring(0, 12).toUpperCase()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Operational Event</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-3">
                            <Badge variant="outline" className={cn("h-6 gap-1.5 px-3 uppercase text-[9px] font-black tracking-tighter", getStatusColor(log.oldStatus))}>
                                {getStatusIcon(log.oldStatus)}
                                {log.oldStatus}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-30" />
                            <Badge variant="outline" className={cn("h-6 gap-1.5 px-3 uppercase text-[9px] font-black tracking-tighter shadow-sm", getStatusColor(log.newStatus))}>
                                {getStatusIcon(log.newStatus)}
                                {log.newStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <UserCircle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{log.staffName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{log.staffEmail}</p>
                            </div>
                          </div>
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
                Operation Logs <span className="mx-2">|</span> {totalCount} Cumulative Events
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
